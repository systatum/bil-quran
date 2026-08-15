from shared.env import BackendEnv as Env
from backend.src.setting_prototype import Setting
from traceback import format_exc
import backend.src.setting as default_setting
import importlib
import types
import sys


class SettingLoader:
    _inner: Setting | None = None

    @staticmethod
    def _load() -> Setting:
        used_setting: default_setting.Setting = default_setting.get_setting()

        lib: types.ModuleType | None = None
        try:
            sys.path.append(Env.get().SETTING_SYS_PATH)
            lib = importlib.import_module(Env.get().SETTING_PYTHON_PATH)
            print(f"Attempting to load setting from file {lib.__file__}")
            loaded_setting = lib.get_setting()
            if not isinstance(loaded_setting, Setting):
                raise ValueError("Imported setting is not an instance of Setting")
            used_setting = loaded_setting
            print(f"Using setting from file {lib.__file__}")
        except ModuleNotFoundError:
            print(
                "ModuleNotFoundError. Alternate setting file likely does not exist, using default setting"
            )
        except Exception as e:
            print(
                f"Exception {type(e).__name__} during importing alternate setting:\n{format_exc()}",
                file=sys.stderr,
            )

        return used_setting

    @classmethod
    def get(cls) -> Setting:
        if cls._inner is None:
            cls._inner = SettingLoader._load()
        return cls._inner
