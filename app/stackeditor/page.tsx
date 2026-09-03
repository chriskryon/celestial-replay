import Link from "next/link";

export default function PlaylistPage() {
  return (
    <section className="empty-surface" aria-labelledby="playlist-title">
      <span className="eyebrow">Playlists salvas</span>
      <h1 id="playlist-title">Monte uma fila e entre para guardá-la.</h1>
      <p>
        O modo Avançado já permite testar qualquer sequência. O salvamento será
        associado à sua conta assim que o Neon Auth estiver ativado.
      </p>
      <Link className="button button-primary" href="/advanced">
        Abrir modo Avançado
      </Link>
    </section>
  );
}
