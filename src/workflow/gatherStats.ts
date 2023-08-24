import { log } from "console";
import { getMps, getDivision, getMemebersDivisions, getAllDivisions, getMemeberVoting } from "./apicall"
import { createMpNode, createDivisionNode, setupNeo, createVotedForDivision, cleanUp, setupDataScience, mostSimilarVotingRecord } from "./neoManager";
import { Mp } from "../models/mps";
import { Division, MemberVoting } from "../models/divisions";
import { VotedFor } from "../models/relationships";
import { setupMongo, insertSimilarity } from "./mongoManager"

const logger = require('../logger');

const CREATE_MPS = true;
const CREATE_DIVISIONS = true;
const CREATE_RELATIONSHIPS = true;

const endAndPrintTiming = (timingStart: number, timingName: string) => {
    // END timing
    let timingEnd = performance.now();
    logger.info(`<<TIMING>> ${timingName} in ${(timingEnd - timingStart) / 1000} seconds`);
}

export const gatherStats = async () => {
    
    logger.info(`Creating ${Number(process.env.MP_LOOPS) * Number(process.env.MP_TAKE_PER_LOOP)} Mps`);
    
    await setupNeo();

    const allMps: Array<Mp> = [];
    const allDivisions: Array<Division> = [];
    const allVotedForRelationships: Array<VotedFor> = [];

    const MAX_LOOPS = 1000;
    let skip = 0;

    let neoCreateCount = 0;

    // Start timing
    let timingStart = performance.now();

    //create all the divisions 
    if (CREATE_DIVISIONS) {

        skip = 0;
        for (let i = 0; i < MAX_LOOPS; i++) {
            skip += 25;
            const divisions: Array<Division> = await getAllDivisions(skip, 25);
            let fetchCount = divisions.length;

            allDivisions.push(...divisions)

            if (fetchCount < 25) {
                break;
            }
        }
        
        logger.debug(`Created ${allDivisions.length} divisions in memory`);        
        neoCreateCount = 0;
        for (let i of allDivisions) {
            await createDivisionNode(i);
            neoCreateCount = neoCreateCount + 1;
        }
        logger.debug(`Created ${neoCreateCount} divisions in Neo4j`);

    }

    // END timing
    endAndPrintTiming(timingStart, 'created divisions');

    // Start timing
    timingStart = performance.now();

    skip = 0;
    neoCreateCount = 0;
    if (CREATE_MPS) {

        for (let i = 0; i < Number(process.env.MP_LOOPS); i++) {

            const mps: Array<Mp> = await getMps(skip, Number(process.env.MP_TAKE_PER_LOOP));

            skip += 25;
            allMps.push(...mps);

            if (mps.length < 20) {
                break;
            }
        }
        logger.debug(`Created ${allMps.length} MPs in memory`);


        for (let i of allMps) {
            await createMpNode(i);
            neoCreateCount = neoCreateCount + 1;
        }
        logger.debug(`Created ${neoCreateCount} MPs in Neo4j`);
    }

    // END timing
    endAndPrintTiming(timingStart, 'created MPs');

    // Start timing
    timingStart = performance.now();

    skip = 0;
    if (CREATE_RELATIONSHIPS) {

        let votesForMp: Array<VotedFor>;
        //make relationships between mps and divisions
        let index = 0;
        for (const mp of allMps) {
            logger.debug('Get relationships for mp ', mp.nameDisplayAs);
            votesForMp = [];

            index += 1;
            let divisionsVotedCount: number = 25;
            let mpVoteCount: number = 0;
            while (divisionsVotedCount === 25) {
                //for each mp get all the divisions they have voted on
                const memeberVotings: Array<MemberVoting> = await getMemeberVoting(skip, 25, mp.id);
                // logger.debug('got votes RESPONSE ', memeberVotings.map(i => i.PublishedDivision.Title).join(','));

                skip += 25;

                //only create releationships for voted for divisions if we have created the division
                let filterVoteCount = 0;

                if (memeberVotings && Array.isArray(memeberVotings)) {
                    memeberVotings.filter(i => {
                        return allDivisions.find(division => division.DivisionId === i.PublishedDivision.DivisionId)
                    }).forEach(vote => {

                        votesForMp.push({
                            mpId: mp.id,
                            divisionId: vote.PublishedDivision.DivisionId,
                            votedAye: vote.MemberVotedAye
                        })
                        filterVoteCount += 1;
                    })

                    divisionsVotedCount = memeberVotings.length;
                }

                mpVoteCount = mpVoteCount + filterVoteCount;

            }

            logger.debug(`createing ${votesForMp.length} Neo RELEATIONSHIPS for MP #${index} ${mp.nameDisplayAs}`);
            for (let votedFor of votesForMp) {
                await createVotedForDivision(votedFor);
            }
            logger.debug(`created ${votesForMp.length} RELEATIONSHIPS for MP #${index} ${mp.nameDisplayAs}`);
            skip = 0;
            mpVoteCount = 0;

        }

        logger.debug(`Creating ${allVotedForRelationships.length} Neo releationships ....`);

    }

    // END timing
    endAndPrintTiming(timingStart, 'creating relationships');

    await setupDataScience();

    //loop through all mps, use neo to find similarity for each one and store the results in mongo
    await setupMongo();

    const BATCH_SIZE = 10;

    // Start timing
    timingStart = performance.now();

    // @ts-ignore
    let mongoData = [];
    let count = 0;
    for (const mp of allMps) {

        logger.debug('Get Similarity for mp ', mp.nameDisplayAs);
        const result = await mostSimilarVotingRecord(mp.nameDisplayAs);

        if (result) {
            const mongoRecord = {
                _id: mp.id,
                name: mp.nameDisplayAs,
                similarity: []
            }

            // @ts-ignore
            result.records.forEach(async record => {
                // @ts-ignore
                mongoRecord.similarity.push({
                    name: record._fields[1],
                    score: record._fields[2]
                })

            })

            logger.debug('created ', mongoRecord);
            mongoData.push(mongoRecord);

            if (count === BATCH_SIZE) {
                count = 0;
                // @ts-ignore   
                await insertSimilarity(mongoData);
                mongoData = [];
            }

        }

        count = count + 1;
    }


    //if any left before flling up batch size then send them to mongo
    if (mongoData.length) {
        await insertSimilarity(mongoData);
        mongoData = [];
    }

    // END timing
    endAndPrintTiming(timingStart, 'creating similarities');

    cleanUp();

    logger.info('END');


}