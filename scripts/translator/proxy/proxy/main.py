from proxy.runpod_client import (
    RunpodAPIClient,
    RunpodAPIError,
    RunpodAPIErrorType,
)
from proxy.runpod_struct import Pod
from shared.apiclient import APIClient as BackendAPIClient, APIError, APIErrorType
from shared.util import printerr
from shared.env import ProxyEnv
from pathlib import Path
from datetime import datetime, timezone
from subprocess import Popen
from signal import SIGTERM
from typing import Optional
from time import sleep
from traceback import print_exc

WORKDIR = Path("./proxy")
TEMPLATE_FILENAME = "TemplateCaddyfile"
NO_ROUTE_FILENAME = "NoRouteCaddyfile"
CADDY_FILENAME = "Caddyfile"
CADDY_PORT = 8049

MAX_POD_LIFETIME_SECONDS = 60 * 60 * 5  # 5 hours
MAX_POD_INACTIVITY_SECONDS = 60 * 30  # 30 minutes


def pod():
    management_key: str = ProxyEnv.get().RUNPOD_MANAGEMENT_KEY
    api_token: str = ProxyEnv.get().API_KEY_REMOTE

    client: RunpodAPIClient = RunpodAPIClient(
        RunpodAPIClient.Setting(management_key=management_key)
    )
    fastapi_client: BackendAPIClient = BackendAPIClient(
        BackendAPIClient.Setting(
            base_url=f"http://127.0.0.1:{CADDY_PORT}", token=api_token
        )
    )
    previous_active_pod: Optional[Pod] = None

    last_activity_timestamp: Optional[datetime] = None
    pod_start_timestamp: Optional[datetime] = None
    while True:
        sleep(5)
        try:
            pods = client.list_pods()
        except RunpodAPIError as e:
            if e.error_type == RunpodAPIErrorType.HTTP_ERROR:
                printerr("HTTP Error on list_pods")
                continue
            printerr("APIError on list_pods")
            print_exc()
            continue

        managed_pods: list[Pod] = [
            pod
            for pod in pods
            if pod.matches_pattern(r"proxy-managed-.*")
            and pod.data_center_id == "EU-RO-1"
        ]
        active_pods: list[Pod] = [
            pod for pod in managed_pods if pod.status == "RUNNING"
        ]

        active_pod: Optional[Pod]
        if len(active_pods) == 0:
            active_pod = None
        elif len(active_pods) > 1:
            disabled_ids: list[str] = [pod.id for pod in active_pods[1:]]
            print(
                "More than 1 pod running, stopping pods with these ids:",
                ", ".join(disabled_ids),
            )
            for disabled_id in disabled_ids:
                try:
                    client.stop_pod(disabled_id)
                except RunpodAPIError as e:
                    if e.error_type == RunpodAPIErrorType.HTTP_ERROR:
                        printerr("HTTP Error on stopping pod id", disabled_id)
                        continue
                    printerr("APIError on stopping pod id", disabled_id)
                    print_exc()
                    continue
            active_pod = active_pods[0]
        else:
            active_pod = active_pods[0]

        if previous_active_pod != active_pod:
            previous_active_pod = active_pod
            if active_pod is not None:
                print("Switching to pod with id:", active_pod)
                write_template(
                    CADDY_PORT,
                    "https://{}-8000.proxy.runpod.net".format(active_pod.id),
                )
            else:
                print("No pods running, disabling proxy behaviour")
                write_no_route(CADDY_PORT)

        if active_pod is None:
            print("No pods running")
            continue

        assert isinstance(active_pod.started_at, datetime)
        pod_start_timestamp = active_pod.started_at

        now: datetime = datetime.now(timezone.utc)
        pod_lifetime: int = int((now - pod_start_timestamp).total_seconds())

        if pod_lifetime > MAX_POD_LIFETIME_SECONDS:
            print(
                "Shutting down pod because it has lived for {:_} seconds, {:_} seconds past max lifetime of {:_}".format(
                    pod_lifetime,
                    pod_lifetime - MAX_POD_LIFETIME_SECONDS,
                    MAX_POD_LIFETIME_SECONDS,
                )
            )
            try:
                client.stop_pod(active_pod.id)
            except RunpodAPIError as e:
                if e.error_type == RunpodAPIErrorType.HTTP_ERROR:
                    printerr("HTTP Error on stopping active pod with id", active_pod.id)
                    continue
                printerr("APIError on stopping active pod with id", active_pod.id)
                print_exc()
                continue
            continue
        else:
            print(
                "Pod has lived for {:_} seconds, {:_} seconds until max lifetime of {:_}".format(
                    pod_lifetime,
                    MAX_POD_LIFETIME_SECONDS - pod_lifetime,
                    MAX_POD_LIFETIME_SECONDS,
                )
            )

        try:
            last_activity_timestamp = fastapi_client.health().last_activity_timestamp
            pod_inactivity: int = int((now - last_activity_timestamp).total_seconds())
            if pod_inactivity > MAX_POD_INACTIVITY_SECONDS:
                print(
                    "Shutting down pod because it has been inactive for {:_} seconds, {:_} seconds past max inactivity of {:_}".format(
                        pod_inactivity,
                        pod_inactivity - MAX_POD_INACTIVITY_SECONDS,
                        MAX_POD_INACTIVITY_SECONDS,
                    )
                )
                try:
                    client.stop_pod(active_pod.id)
                except RunpodAPIError as e:
                    if e.error_type == RunpodAPIErrorType.HTTP_ERROR:
                        printerr(
                            "HTTP Error on stopping active pod with id", active_pod.id
                        )
                        continue
                    printerr("APIError on stopping active pod with id", active_pod.id)
                    print_exc()
                    continue
                continue
            else:
                print(
                    "Pod has been inactive for {:_} seconds, {:_} seconds until max inactivity of {:_}".format(
                        pod_inactivity,
                        MAX_POD_INACTIVITY_SECONDS - pod_inactivity,
                        MAX_POD_INACTIVITY_SECONDS,
                    )
                )
        except APIError as e:
            if e.error_type == APIErrorType.NOT_SERVER_RESPONSE_ERROR:
                printerr(
                    "Not our server that responded: {}".format(
                        e.error_message[:200] + "..."
                        if len(e.error_message) > 200
                        else ""
                    )
                )
                continue
            import traceback

            traceback.print_exc()


def main():
    write_no_route(CADDY_PORT)
    proc = Popen(["caddy", "run", "-wc", str(WORKDIR / CADDY_FILENAME)])

    pod()

    proc.send_signal(SIGTERM)
    print("Caddy exited with code:", proc.wait())


def write_template(caddy_port: int, runpod_url: str):
    with open(WORKDIR / TEMPLATE_FILENAME) as file:
        content = file.read().strip()

    content = content.replace("{{CADDY_PORT}}", str(caddy_port))
    content = content.replace("{{RUNPOD_URL}}", runpod_url)
    assert "{{" not in content
    assert "}}" not in content

    with open(WORKDIR / CADDY_FILENAME, "w") as file:
        file.write(content)


def write_no_route(caddy_port: int):
    with open(WORKDIR / NO_ROUTE_FILENAME) as file:
        content = file.read().strip()

    content = content.replace("{{CADDY_PORT}}", str(caddy_port))
    assert "{{" not in content
    assert "}}" not in content

    with open(WORKDIR / CADDY_FILENAME, "w") as file:
        file.write(content)


if __name__ == "__main__":
    main()
