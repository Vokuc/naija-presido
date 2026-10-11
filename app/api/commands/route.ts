import { NextResponse } from 'next/server';
import { createClient } from '@/lib/db/server';
import { Commands, Command } from '@/lib/types/command-types';
import { executeCommand, getCommandDefinition } from '@/lib/commands';
import { createAccountHandler } from '@/src/server/commands/identity/create-account';
import { createCharacterHandler } from '@/src/server/commands/identity/create-character';
import { selectCharacterHandler } from '@/src/server/commands/identity/select-character';
import { updateCharacterHandler } from '@/src/server/commands/identity/update-character';
import { changeLocationHandler } from '@/src/server/commands/movement/change-location';
import { enterVenueHandler } from '@/src/server/commands/movement/enter-venue';
import { leaveVenueHandler } from '@/src/server/commands/movement/leave-venue';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const command: Command<unknown> = await request.json();
    if (!command || !command.type) {
      return NextResponse.json({ error: 'Invalid command format' }, { status: 400 });
    }

    const ctx = {
      db: supabase,
      actorId: user?.id,
    };

    let result;

    // Check if the command has an authoritative registry definition
    if (getCommandDefinition(command.type)) {
      result = await executeCommand(command, ctx);
    } else {
      switch (command.type) {
        case Commands.CREATE_ACCOUNT:
          result = await createAccountHandler(command as any, ctx);
          break;
        case Commands.CREATE_CHARACTER:
          result = await createCharacterHandler(command as any, ctx);
          break;
        case Commands.SELECT_CHARACTER:
          result = await selectCharacterHandler(command as any, ctx);
          break;
        case Commands.UPDATE_CHARACTER:
          result = await updateCharacterHandler(command as any, ctx);
          break;
        case Commands.MOVE_CHARACTER:
          result = await changeLocationHandler(command as any, ctx);
          break;
        case Commands.ENTER_VENUE:
          result = await enterVenueHandler(command as any, ctx);
          break;
        case Commands.LEAVE_VENUE:
          result = await leaveVenueHandler(command as any, ctx);
          break;
        default:
          return NextResponse.json({ error: 'Unknown command type' }, { status: 400 });
      }
    }

    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: result.status || 400 });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('Command execution error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
