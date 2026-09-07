from abc import ABC, abstractmethod
from typing import Any


class BaseExecutor(ABC):
    """Abstraction over GPU/CPU container runtimes."""

    @abstractmethod
    def get_run_kwargs(self, job_id: str, workspace_path: str, image: str, entrypoint: str) -> dict[str, Any]:
        """Return kwargs for docker.containers.run()."""
        ...

    @abstractmethod
    def name(self) -> str:
        ...
