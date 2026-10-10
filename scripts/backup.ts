import {backup} from '../src/modules/maintenance/backup';
if(!process.env.DATABASE_URL||!process.argv[2])throw new Error('Usage: DATABASE_URL=... ./scripts/backup.sh OUTPUT_PATH');
await backup(process.env.DATABASE_URL,process.argv[2]);console.log('Backup created with owner-only permissions. Keep it private; do not publish it.');
