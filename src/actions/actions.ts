'use server'

export async function create(token_address: any) {

  let url = new URL("http://78.141.200.67:3000/build")
  url.search = new URLSearchParams({
    fa_metadata: token_address,
  }).toString();

  const res = await fetch(url)
  const payload = await res.json();

  return payload;

}