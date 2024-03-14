import dotenv from 'dotenv';
import statusRouter from './src/routes/statusRouter';

import { gatherStats, createParties } from './src/workflow/gatherStats';
import { setupNeo } from './src/workflow/neoManager';
import { getDonations } from "./src/workflow/donationsManager";

dotenv.config();
gatherStats();  

//TODO remove when not run in isolation

const go = async () => {
  // await setupNeo();
  // await createParties();
  // await getDonations();
}

go();

