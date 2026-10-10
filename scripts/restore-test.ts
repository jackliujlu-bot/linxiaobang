import {restoreForTest} from '../src/modules/maintenance/backup';
if(!process.env.DATABASE_URL||!process.argv[2])throw new Error('Usage: sh scripts/restore-test.sh BACKUP_PATH');
const result=await restoreForTest(process.env.DATABASE_URL,process.argv[2]);console.log('Restore verified in isolated temporary database:',result.database,'rows:',result.rows,'Temporary database removed.');
