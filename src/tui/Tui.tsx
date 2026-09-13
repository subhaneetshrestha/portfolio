// Placeholder frame. Task 2 replaces this with the real shell.
export function Tui({ pane }: { pane: string | null }) {
  return (
    <main>
      <p>
        subhaneet@arch:~$ {pane ?? ''}<span className="cursor">▊</span>
      </p>
      <p className="muted"># tui under construction — resume, projects, deployments arrive next</p>
    </main>
  );
}
