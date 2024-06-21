export async function generateLink(longLink) {
  return fetch('https://api-ssl.bitly.com/v4/shorten', {
    method: 'POST',
    body: JSON.stringify({ long_url: longLink }), // domain: "bit.ly" (default)
    headers: { Authorization: import.meta.env.VITE_BITLY_KEY, 'Content-Type': 'application/json' }
  })
    .then((result) => result.json())
    .then((body) => ({ link: body.link, errorNeeded: false }))
    .catch(() => {
      if (import.meta.env.VITE_BITLY_KEY == null) {
        console.error(
          'Error: VITE_BITLY_KEY needs to be set as an environment variable in order to share FSH Online links.'
        );
        return { link: undefined, errorNeeded: true };
      } else {
        return { link: undefined, errorNeeded: true };
      }
    });
}

export async function expandLink(encodedFsh) {
  const bitlyURL = `bit.ly/${encodedFsh.text}`;
  return fetch('https://api-ssl.bitly.com/v4/expand', {
    method: 'POST',
    body: JSON.stringify({ bitlink_id: bitlyURL }),
    headers: { Authorization: import.meta.env.VITE_BITLY_KEY, 'Content-Type': 'application/json' }
  })
    .then((result) => result.json())
    .catch((error) => console.error(error));
}
