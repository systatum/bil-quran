from proxy.apiclient import APIClient


def main():
    with open(".runpod-management-key") as file:
        api_key = file.read().strip()

    client = APIClient(APIClient.Setting(api_key=api_key))
    pods = client.list_pods()

    managed_pods = [
        pod
        for pod in pods
        if pod.matches_pattern(r"proxy-managed-.*") and pod.data_center_id == "EU-RO-1"
    ]
    print(managed_pods)
    print([p.active_duration_seconds() for p in managed_pods])


if __name__ == "__main__":
    main()
