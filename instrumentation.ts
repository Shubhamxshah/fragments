import { IntrospectionAISDKIntegration } from '@introspection-sdk/introspection-node'

let integration: IntrospectionAISDKIntegration | undefined

export function getIntrospectionAISDKIntegrations() {
  if (!process.env.INTROSPECTION_TOKEN) {
    return []
  }

  if (!integration) {
    integration = new IntrospectionAISDKIntegration({
      serviceName: 'fragments-builder',
    })
  }

  return [integration]
}

export function introspectionTelemetry(
  agentName: string,
  conversationId?: string,
) {
  const integrations = getIntrospectionAISDKIntegrations()
  const metadata: Record<string, string> = {
    'gen_ai.agent.name': agentName,
  }

  if (conversationId) {
    metadata['gen_ai.conversation.id'] = conversationId
  }

  return {
    isEnabled: integrations.length > 0,
    functionId: agentName,
    metadata,
    integrations,
  }
}
