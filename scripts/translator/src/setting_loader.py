from src.setting_prototype import Setting, get_env
from traceback import format_exc
import src.setting as default_setting
import importlib
import types
import sys


class SettingLoader:
    _inner: Setting | None = None

    @staticmethod
    def _load() -> Setting:
        ALT_SETTING_SYS_PATH: str = get_env("ALT_SETTING_SYS_PATH")
        ALT_SETTING_PYTHON_PATH: str = get_env("ALT_SETTING_PYTHON_PATH")
        used_setting: default_setting.Setting = default_setting.get_setting()

        lib: types.ModuleType | None = None
        try:
            sys.path.append(ALT_SETTING_SYS_PATH)
            lib = importlib.import_module(ALT_SETTING_PYTHON_PATH)
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
