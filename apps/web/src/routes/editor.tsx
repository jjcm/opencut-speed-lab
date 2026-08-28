import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/editor')({
  component: Editor,
  head: () => ({
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400..900&display=swap',
      },
    ],
  }),
})

function Editor() {
  return (
    <main>
      <h1>Editor</h1>
      <p>Coming soon.</p>
    </main>
  )
}
