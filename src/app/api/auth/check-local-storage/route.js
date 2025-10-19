// Emergency localStorage inspector
export async function GET() {
  return Response.json({
    message: 'This is a server-side endpoint. Use client-side localStorage inspection.',
    instructions: 'Check localStorage.getItem("devViewRole") in browser console'
  })
}