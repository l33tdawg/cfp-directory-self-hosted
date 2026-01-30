/**
 * Plugin Actions API
 *
 * Invokes plugin actions defined in the plugin's `actions` map.
 * Actions are used for dynamic operations like fetching data from external APIs.
 *
 * POST /api/plugins/[pluginId]/actions/[actionName]
 * Body: { params: { ... } }
 *
 * @version 1.7.0
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getApiUser } from '@/lib/auth';
import { getPluginRegistry } from '@/lib/plugins/registry';
import { loadSinglePlugin } from '@/lib/plugins/loader';
import { z } from 'zod';

// Action params are sent directly in the body (not wrapped in a "params" key)
const actionParamsSchema = z.record(z.string(), z.unknown());

export async function POST(
  request: Request,
  { params }: { params: Promise<{ pluginId: string; actionName: string }> }
) {
  try {
    const { pluginId, actionName } = await params;
    const user = await getApiUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Require admin role for invoking plugin actions
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Verify plugin exists and is enabled in database
    const pluginRecord = await prisma.plugin.findUnique({
      where: { id: pluginId },
      select: { id: true, name: true, enabled: true },
    });

    if (!pluginRecord) {
      return NextResponse.json(
        { error: 'Plugin not found' },
        { status: 404 }
      );
    }

    if (!pluginRecord.enabled) {
      return NextResponse.json(
        { error: 'Plugin is not enabled' },
        { status: 400 }
      );
    }

    // Get plugin from registry
    const registry = getPluginRegistry();
    let loadedPlugin = registry.get(pluginRecord.name);

    // If not in registry, try to load it (handles hot-reload scenarios)
    if (!loadedPlugin) {
      await loadSinglePlugin(pluginRecord.name);
      loadedPlugin = registry.get(pluginRecord.name);
    }

    if (!loadedPlugin) {
      return NextResponse.json(
        { error: 'Plugin not loaded in registry' },
        { status: 500 }
      );
    }

    // Check if plugin has actions
    if (!loadedPlugin.plugin.actions) {
      return NextResponse.json(
        { error: 'Plugin does not define any actions' },
        { status: 400 }
      );
    }

    // Check if the specific action exists
    const actionHandler = loadedPlugin.plugin.actions[actionName];
    if (!actionHandler) {
      return NextResponse.json(
        { error: `Action '${actionName}' not found in plugin` },
        { status: 404 }
      );
    }

    // Parse request body - params are sent directly in the body
    const body = await request.json().catch(() => ({}));
    const actionParams = actionParamsSchema.parse(body);

    // Invoke the action
    const result = await actionHandler(loadedPlugin.context, actionParams);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error invoking plugin action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
