
import { getMps, getAllDivisions, getMemeberVoting } from "./apicall"
import { createMpNode, createDivisionNode, setupNeo, createVotedForDivision, cleanUp, setupDataScience, getPartyMpCounts, createPartyNode, createParyRelationships } from "./neoManager";
import { Mp } from "../models/mps";
import { Division, MemberVoting } from "../models/divisions";
import { VotedFor } from "../models/relationships";
import { getDonations } from "./donationsManager";

const logger = require('../logger');

//these 3 used for re-runs
const CREATE_MPS = true;
const CREATE_DIVISIONS = true;
const MP_START_NUMBER = 0;

const USE_NEO = true;
const CREATE_RELATIONSHIPS = true;
const PERFORM_DATA_SCIENCE = true;
const CREATE_DONATIONS = true;
const CREATE_PARTIES = true;

const endAndPrintTiming = (timingStart: number, timingName: string) => {
    // END timing
    let timingEnd = performance.now();
    logger.info(`<<TIMING>> ${timingName} in ${(timingEnd - timingStart) / 1000} seconds`);
}

/**
 * Order mps by name
 * @param a 
 * @param b 
 * @returns 
 */
const sortMps = (a: Mp, b: Mp) => {
    if (a.nameDisplayAs < b.nameDisplayAs) {
        return -1;
    }
    if (a.nameDisplayAs > b.nameDisplayAs) {
        return 1;
    }
    return 0;
}

export const createParties = async () => {

    logger.info("Creating party nodes")

    const result = await getPartyMpCounts(); 

    const allParties:any = [];
    for await (const record of  result.records) {

        const party = { 
            name: record._fields[0],
            mpsCount: record._fields[1].low,
        }

        allParties.push(party);

    }

    const otherParties = [
        "Sinn Fin",
        "Conservative",
        "Labour",
        "Liberal Democrat",
        "Renew",
        "Duma Polska  Polish Pride Deregistered 021019",
        "British National Party",
        "Scottish Socialist Party",
        "Scottish National Party",
        "Plaid Cymru",
        "People Before Profit",
        "UK Independence Party",
        "Green Party",
        "Ashfield Independents",
        "Communist Party of Britain",
        "Veterans and Peoples Party Deregistered 091123",
        "Womens Equality Party",
        "Cooperative Party",
        "Alliance  Alliance Party of Northern Ireland",
        "Aspire",
        "Yorkshire Party",
        "Ulster Unionist Party",
        "Advance Together Deregistered 011020",
        "Reform UK",
        "The Official Monster Raving Loony Party",
        "Scottish Green Party",
        "Scottish Libertarian Party Deregistered 111122",
        "The Independent Group for Change Deregistered 230720",
        "The Liberal Party",
        "The Reclaim Party",
        "The Radical Party Deregistered 191020",
        "Hersham Village Society",
        "Animal Welfare Party",
        "True  Fair Party",
        "Alba Party",
        "The Socialist Party of Great Britain",
        "London Real Party",
        "All For Unity Deregistered 060522",
        "Rejoin EU",
        "Scottish Family Party",
        "Traditional Unionist Voice  TUV",
        "Breakthrough Party",
        "British National Party Deregistered 080116",
        "ProLife Deregistered 241204",
        "Legalise Cannabis Alliance Deregistered 211106",
        "Christian Party",
        "The New Party Deregistered 010710",
        "The Peoples Alliance Deregistered 140704",
        "Forward Wales Deregistered 160310",
        "The Respect Party Deregistered 180816",
        "The Peace Party  Nonviolence Justice Environment",
        "Common Good",
        "Alliance For Green Socialism",
        "Veritas Deregistered 050516",
        "The Blah Party Deregistered 110908",
        "Mums Army Deregistered 130312",
        "mums4justice Deregistered 160511",
        "women4theworld Deregistered 080609",
        "Scottish Voice Deregistered 121115",
        "National Front Deregistered 011114",
        "Better Bedford Independent Party Deregistered 200911",
        "Left List Deregistered 200410",
        "The Buckinghamshire Campaign for Democracy Deregistered 010710",
        "East Herts People Deregistered 051113",
        "Mebyon Kernow  The Party for Cornwall",
        "No2EUYes to Democracy Deregistered 021110",
        "United Kingdom First Deregistered 120410",
        "Fair Pay Fair Trade Party Deregistered 270709",
        "Yes 2 Europe",
        "Pro Democracy Libertaseu Deregistered 021110",
        "Jury Team Deregistered 090511",
        "Trust Deregistered 120411",
        "Freedom and Responsibility Deregistered 070611",
        "Solihull and Meriden Residents Association",
        "Democracy 2015 Deregistered 011114",
        "Dont Cook Party Deregistered 200614",
        "Life",
        "We Demand A Referendum Now Deregistered 031116",
        "NO2EU Deregistered 011114",
        "Fulham Group Deregistered 041115",
        "All Peoples Party Deregistered 170420",
        "Socialist Alliance Deregistered 300622",
        "Tower Hamlets First Deregistered 290415",
        "Cannabis is Safer than Alcohol Deregistered 031116",
        "Both Unions Party of Northern Ireland",
    ]

    otherParties.forEach(i => {
        // @ts-ignore
        if (!allParties.find(o => o.name === i)) {
            allParties.push({ name: i, mpsCount: 0 })   
        }
    })

    for await (const party of allParties) {
        await createPartyNode(party);
    }

    logger.info(`Created ${allParties.length} pary nodes`);

    await createParyRelationships();

}

export const gatherStats = async () => {

    logger.info(`Creating ${Number(process.env.MP_LOOPS) * Number(process.env.MP_TAKE_PER_LOOP)} Mps`);

    await setupNeo();

    const allMps: Array<Mp> = [];
    const allDivisions: Array<Division> = [];

    const MAX_LOOPS = 1000;
    let skip = 0;

    let neoCreateCount = 0;

    // Start timing
    const totalTimeStart = performance.now();
    let timingStart = performance.now();

    //create all the divisions     
    skip = 0;
    for (let i = 0; i < MAX_LOOPS; i++) {
        //get all the divisions from the API (25 at a time) and store them in memory        
        const divisions: Array<Division> = await getAllDivisions(skip, 25);
        skip += 25;
        let fetchCount = divisions.length;

        allDivisions.push(...divisions)

        if (fetchCount < 25) {
            break;
        }
    }

    logger.debug(`Created ${allDivisions.length} divisions in memory`);

    if (USE_NEO && CREATE_DIVISIONS) {
        neoCreateCount = 0;
        for (let i of allDivisions) {
            //loop through all mps in memory and store them in database
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

    for (let i = 0; i < Number(process.env.MP_LOOPS); i++) {

        const mps: Array<Mp> = await getMps(skip, Number(process.env.MP_TAKE_PER_LOOP));

        skip += 25;
        allMps.push(...mps);

        if (mps.length < 20) {
            break;
        }
    }

    allMps.sort(sortMps);
    logger.debug(`Created ${allMps.length} MPs in memory`);

    if (CREATE_MPS && USE_NEO) {
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
        // @ts-ignore
        let votedAye = [];
        // @ts-ignore
        let votedNo = [];

        for (let i = MP_START_NUMBER; i < allMps.length; i++) {

            const mp = allMps[i];
            const mpNumber = index + MP_START_NUMBER;

            logger.debug(`get relationships for mp [${mpNumber}] ${mp.nameDisplayAs}`);

            votesForMp = [];
            index += 1;
            let divisionsVotedCount: number = 25;
            let mpVoteCount: number = 0;
            while (divisionsVotedCount === 25) {

                let memeberVotings: Array<MemberVoting>;
                try {
                    //for each mp get all the divisions they have voted on
                    memeberVotings = await getMemeberVoting(skip, 25, mp.id);
                } catch (error) {
                    logger.info("CHECK ME OUT DOING A RETRY!!!!!!!!!")
                    //this sometimes fails for network issues so want to retry just once for now
                    memeberVotings = await getMemeberVoting(skip, 25, mp.id);
                }


                skip += 25;

                //only create releationships for voted for divisions if we have created the division
                let filterVoteCount = 0;

                if (memeberVotings && Array.isArray(memeberVotings)) {
                    memeberVotings.filter(i => {
                        return allDivisions.find(division => division.DivisionId === i.PublishedDivision.DivisionId)
                    }).forEach(vote => {
                        // @ts-ignore
                        let votes = {
                            // @ts-ignore
                            mpId: mp.id,
                            divisionId: vote.PublishedDivision.DivisionId,
                            votedAye: vote.MemberVotedAye
                        };

                        votesForMp.push(votes);

                        if (vote.MemberVotedAye) {
                            votedAye.push(vote.PublishedDivision?.DivisionId);
                        } else {
                            votedNo.push(vote.PublishedDivision?.DivisionId);
                        }


                        filterVoteCount += 1;
                    })

                    divisionsVotedCount = memeberVotings.length;
                }

                mpVoteCount = mpVoteCount + filterVoteCount;

            }

            if (USE_NEO) {
                logger.debug(`creating ${votesForMp.length} Neo RELEATIONSHIPS for MP [${mpNumber}] ${mp.nameDisplayAs}`);
                for (let votedFor of votesForMp) {
                    await createVotedForDivision(votedFor);
                }
            }

            logger.debug(`created ${votesForMp.length} RELEATIONSHIPS for MP [${mpNumber}] ${mp.nameDisplayAs}`);
            skip = 0;
            mpVoteCount = 0;

        }

    }

    if (CREATE_PARTIES) {
        createParties();
    }


    if (CREATE_DONATIONS) {
        getDonations();
    }


    // END timing
    endAndPrintTiming(timingStart, 'creating relationships');

    if (PERFORM_DATA_SCIENCE && USE_NEO) {
        await setupDataScience();
    }

    if (USE_NEO) {
        cleanUp();
    }

    endAndPrintTiming(totalTimeStart, 'Workflow complete');

    logger.info('END');

}