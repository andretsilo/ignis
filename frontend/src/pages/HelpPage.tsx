export function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <span>🔥</span> ignis — help
        </h1>
        <p className="text-zinc-500 mt-2">
          Self-hosted GPU training platform. Submit deep learning jobs from any device, run them on your own hardware.
        </p>
      </div>

      <div className="flex flex-col gap-10">

        {/* What is ignis */}
        <section>
          <h2 className="text-base font-semibold text-zinc-200 mb-3">What is ignis?</h2>
          <div className="text-sm text-zinc-400 leading-relaxed flex flex-col gap-2">
            <p>
              ignis is a self-hosted platform that lets you run deep learning training jobs in isolated Docker
              containers on your own GPU machine — and monitor them from any device on your network.
            </p>
            <p>
              You upload a ZIP file containing your training script, choose a Docker image, set an entrypoint
              command, and submit. ignis queues the job, pulls the image, runs the container, and streams
              stdout/stderr live to your browser in real time via WebSockets.
            </p>
            <p>
              All compute stays on your machine. No cloud bills, no data leaving your network.
            </p>
          </div>
        </section>

        {/* Submitting a job */}
        <section>
          <h2 className="text-base font-semibold text-zinc-200 mb-3">Submitting a job</h2>
          <ol className="flex flex-col gap-4">
            {[
              {
                n: '1',
                title: 'Prepare your ZIP',
                body: 'Create a .zip file containing your training script and any supporting files. The entrypoint command runs at the root of the extracted ZIP (e.g. python train.py).',
              },
              {
                n: '2',
                title: 'Choose a Docker image',
                body: 'Select the pre-configured ROCm+PyTorch image for AMD GPUs, or enter a custom image such as pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime for NVIDIA GPUs, or python:3.12-slim for CPU-only.',
              },
              {
                n: '3',
                title: 'Set the entrypoint',
                body: 'Shell command that runs inside the container. The default installs requirements.txt first, then runs train.py. Use && to chain commands.',
              },
              {
                n: '4',
                title: 'Submit and monitor',
                body: 'Click Submit. The job appears in the list with a status badge. Click it to open the detail view where logs stream live.',
              },
            ].map(s => (
              <li key={s.n} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-xs flex items-center justify-center font-mono mt-0.5">
                  {s.n}
                </span>
                <div>
                  <p className="text-sm font-medium text-zinc-300">{s.title}</p>
                  <p className="text-sm text-zinc-500 mt-0.5">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Job lifecycle */}
        <section>
          <h2 className="text-base font-semibold text-zinc-200 mb-3">Job lifecycle</h2>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            {[
              { status: 'queued',    color: 'text-zinc-400 bg-zinc-800',    desc: 'Job accepted, waiting for the Celery worker to pick it up.' },
              { status: 'building', color: 'text-yellow-300 bg-yellow-950', desc: 'Extracting ZIP and pulling the Docker image (may take a few minutes).' },
              { status: 'running',  color: 'text-blue-300 bg-blue-950',     desc: 'Container is running. Logs are streaming live to your browser.' },
              { status: 'completed',color: 'text-green-300 bg-green-950',   desc: 'Training finished with exit code 0. Output files are available.' },
              { status: 'failed',   color: 'text-red-300 bg-red-950',       desc: 'Non-zero exit code. Check the error output section.' },
              { status: 'cancelled',color: 'text-orange-300 bg-orange-950', desc: 'Manually stopped, or container killed (exit codes 137/143).' },
            ].map(row => (
              <div key={row.status} className="flex items-start gap-3 px-4 py-3 border-b border-zinc-800 last:border-0">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide flex-shrink-0 mt-0.5 ${row.color}`}>
                  {row.status}
                </span>
                <span className="text-sm text-zinc-400">{row.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* GPU backends */}
        <section>
          <h2 className="text-base font-semibold text-zinc-200 mb-3">GPU backends</h2>
          <div className="flex flex-col gap-3">
            {[
              {
                name: 'rocm_wsl2',
                title: 'AMD — ROCm via ROCDXG (WSL2)',
                desc: 'Uses /dev/dxg + librocdxg for AMD GPUs on Windows with WSL2. Confirmed working with RX 9060 XT (gfx1200) and ROCm 7.2.1. Set GPU_EXECUTOR=rocm_wsl2 in backend/.env.',
              },
              {
                name: 'cuda',
                title: 'NVIDIA — CUDA via nvidia-container-toolkit',
                desc: 'Standard NVIDIA GPU passthrough. Requires nvidia-container-toolkit on the host. Set GPU_EXECUTOR=cuda in backend/.env.',
              },
              {
                name: 'cpu',
                title: 'CPU fallback',
                desc: 'No GPU — works anywhere Docker runs. Slow for training but useful for testing. Set GPU_EXECUTOR=cpu in backend/.env.',
              },
            ].map(b => (
              <div key={b.name} className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-xs text-orange-300 bg-zinc-800 px-1.5 py-0.5 rounded font-mono">{b.name}</code>
                  <span className="text-sm font-medium text-zinc-300">{b.title}</span>
                </div>
                <p className="text-sm text-zinc-500">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Training script contract */}
        <section>
          <h2 className="text-base font-semibold text-zinc-200 mb-3">Training script contract</h2>
          <div className="flex flex-col gap-2 text-sm text-zinc-400">
            <p>Your script runs inside a Docker container. The working directory is your unzipped script root.</p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>Exit code <code className="text-zinc-300 bg-zinc-800 px-1 rounded">0</code> → job marked <span className="text-green-400">completed</span>.</li>
              <li>Any other exit code → job marked <span className="text-red-400">failed</span>. The last 200 lines of output are saved as the error message.</li>
              <li>Exit codes <code className="text-zinc-300 bg-zinc-800 px-1 rounded">137</code> / <code className="text-zinc-300 bg-zinc-800 px-1 rounded">143</code> → job marked <span className="text-orange-400">cancelled</span> (SIGKILL / SIGTERM).</li>
              <li>The environment variable <code className="text-zinc-300 bg-zinc-800 px-1 rounded">PYTHONUNBUFFERED=1</code> is always set so logs appear in real time.</li>
              <li>All files written to the working directory are available as output files after the job finishes.</li>
            </ul>
          </div>
        </section>

        {/* Remote access */}
        <section>
          <h2 className="text-base font-semibold text-zinc-200 mb-3">Remote access via Tailscale</h2>
          <div className="flex flex-col gap-2 text-sm text-zinc-400">
            <p>
              ignis is designed to run behind{' '}
              <a
                href="https://tailscale.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                Tailscale
              </a>.
              Install Tailscale on the GPU machine and on your client device, join the same tailnet,
              and navigate to{' '}
              <code className="text-zinc-300 bg-zinc-800 px-1 rounded">http://&lt;tailscale-ip&gt;:3000</code>.
            </p>
            <p>
              To point this frontend at a remote backend, set{' '}
              <code className="text-zinc-300 bg-zinc-800 px-1 rounded">VITE_API_URL</code> at build time
              or when running the dev server:{' '}
              <code className="text-zinc-300 bg-zinc-800 px-1 rounded">VITE_API_URL=http://&lt;ip&gt;:8000 npm run dev</code>.
            </p>
          </div>
        </section>

        {/* API */}
        <section>
          <h2 className="text-base font-semibold text-zinc-200 mb-3">API reference</h2>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden text-sm font-mono">
            {[
              { method: 'POST', path: '/auth/register',              desc: 'Create account' },
              { method: 'POST', path: '/auth/login',                 desc: 'Get JWT token' },
              { method: 'GET',  path: '/jobs',                       desc: 'List your jobs' },
              { method: 'POST', path: '/jobs',                       desc: 'Submit a new job' },
              { method: 'GET',  path: '/jobs/{id}',                  desc: 'Get job details' },
              { method: 'POST', path: '/jobs/{id}/cancel',           desc: 'Cancel a running job' },
              { method: 'GET',  path: '/jobs/{id}/artifacts',        desc: 'List output files' },
              { method: 'GET',  path: '/jobs/{id}/artifacts/download', desc: 'Download a file' },
              { method: 'WS',   path: '/ws/jobs/{id}',               desc: 'Live log stream' },
              { method: 'GET',  path: '/system/stats',               desc: 'CPU / RAM / GPU metrics' },
            ].map(r => (
              <div key={r.path} className="flex items-start gap-3 px-4 py-2.5 border-b border-zinc-800/60 last:border-0 hover:bg-zinc-900/60">
                <span className={`text-xs font-bold uppercase shrink-0 w-10 ${
                  r.method === 'GET'  ? 'text-green-400' :
                  r.method === 'POST' ? 'text-blue-400'  :
                  r.method === 'WS'   ? 'text-purple-400' :
                  'text-zinc-400'
                }`}>{r.method}</span>
                <span className="text-zinc-300 text-xs flex-1">{r.path}</span>
                <span className="text-zinc-500 text-xs hidden sm:block">{r.desc}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-600 mt-2">
            Full interactive docs at{' '}
            <a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
              /docs
            </a>{' '}
            when the backend is running.
          </p>
        </section>

      </div>
    </div>
  )
}
