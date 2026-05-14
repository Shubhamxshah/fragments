export async function register() {
  if (process.env.NEXT_RUNTIME !== 'edge') {
    const { registerOtel } = await import('./instrumentation.node')
    registerOtel()
  }
}
