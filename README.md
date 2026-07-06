# ignis
Self-hosted, hardware-agnostic remote GPU training platform. Submit deep learning jobs from anywhere, run them in isolated Docker containers on your own machine (any OS, any GPU vendor), and stream logs/metrics live via WebSockets.
────────────────────────────────────────────────────────────────────────────────────────────────────

Prerequisites

These are one-time setup steps per machine. They are not part of the application code — the app
itself is portable across all configurations below.

  1. Docker Desktop (Windows)

  - Download and install Docker Desktop (https://www.docker.com/products/docker-desktop/)
  - During setup, choose the WSL2 backend (not Hyper-V)
  - Verify: docker info should show Context: desktop-linux and Kernel Version: ...-WSL2

  2. WSL2

  Docker Desktop installs WSL2 automatically, but make sure it is set as the default version:

  wsl --set-default-version 2

  Your WSL2 distro must be a clean, working Ubuntu install. If you have issues:

  wsl --unregister Ubuntu
  wsl --install -d Ubuntu

  3. GPU Driver Setup (choose one path)

  Path A — AMD GPU, ROCm-in-WSL2 (recommended for RDNA2/RDNA3; experimental for RDNA4)

  Install the latest AMD Adrenalin driver (https://www.amd.com/en/support) on Windows first, then
  inside WSL2:

  cd ~
  wget https://repo.radeon.com/amdgpu-install/6.4/ubuntu/jammy/amdgpu-install_6.4.60400-1_all.deb
  sudo apt install ./amdgpu-install_6.4.60400-1_all.deb -y
  sudo amdgpu-install --usecase=rocm --no-dkms -y
  sudo usermod -a -G render,video $USER

  │ --no-dkms is mandatory for WSL2 — it skips kernel module installation, which WSL2 does not
  support.

  Exit and reopen WSL2, then verify:

  rocminfo | grep -i "gfx\|name"

  Path B — AMD GPU, DirectML (simpler; works on any AMD GPU including RDNA4)

  No WSL2 setup needed. Install the Windows Python package directly:

  pip install torch-directml
  python -c "import torch_directml; print(torch_directml.device())"

  This is the recommended fallback if ROCm-in-WSL2 is unstable on your hardware.

  Path C — NVIDIA GPU, CUDA-in-WSL2

  Install the NVIDIA WSL2 CUDA driver (https://developer.nvidia.com/cuda/wsl) on Windows (do not
   install CUDA inside WSL2 — the Windows driver handles it). Verify inside WSL2:

  nvidia-smi

  Path D — CPU only (always works, slow)

  No additional setup. Set GPU_EXECUTOR=cpu in .env.

  4. Verify GPU device nodes in WSL2 (AMD/NVIDIA paths)

  ls /dev/kfd /dev/dri

  Both should exist. If /dev/kfd is missing, your AMD driver installation on Windows is incomplete.

  5. Tailscale

  - Install Tailscale (https://tailscale.com/download) on the GPU machine and on every client device
  - Log in and join the same tailnet, or use node-sharing for external users
  - Verify the client can ping the GPU machine Tailscale IP before proceeding