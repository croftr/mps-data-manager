import { log } from 'console';
import { Division } from '../models/divisions';
import { responseWrapper, responseValue, Mp } from '../models/mps';
import { VotedFor } from '../models/relationships';
import neo4j from "neo4j-driver";

const logger = require('../logger');

let CONNECTION_STRING = `bolt://${process.env.DOCKER_HOST}:7687`;
// let CONNECTION_STRING = `neo4j+s://bb90f2dc.databases.neo4j.io`;
let driver: any;

const runCypher = async (cypher: string, session: any) => {
    logger.trace(cypher);
    try {
        const result = await session.run(cypher);
        return result;
    } catch (error:any) {
        if (error.code !== "Neo.ClientError.Schema.ConstraintValidationFailed" && error.code !== "Neo.ClientError.Schema.EquivalentSchemaRuleAlreadyExists") {
            logger.error(error);
            logger.error(cypher);
        }
        
    }
}

export const getMpNames = async () => {

    logger.debug('Getting MP Names...');

    CONNECTION_STRING = `bolt://${process.env.DOCKER_HOST}:7687`;
    // CONNECTION_STRING = `neo4j+s://bb90f2dc.databases.neo4j.io`;
    driver = neo4j.driver(CONNECTION_STRING, neo4j.auth.basic(process.env.NEO4J_USER || '', process.env.NEO4J_PASSWORD || ''));
    const session = driver.session();

    try {
        const result = await runCypher(`MATCH (n:Mp) RETURN n.nameDisplayAs, n.id`, session);
        return result;
    } finally {
        session.close();
    }
}

export const getDivisionNames = async () => {

    logger.debug('Getting DIVISION Names...');

    CONNECTION_STRING = `bolt://${process.env.DOCKER_HOST}:7687`;
    // CONNECTION_STRING = `neo4j+s://bb90f2dc.databases.neo4j.io`;
    driver = neo4j.driver(CONNECTION_STRING, neo4j.auth.basic(process.env.NEO4J_USER || '', process.env.NEO4J_PASSWORD || ''));
    const session = driver.session();

    try {
        const result = await runCypher(`MATCH (n:Division) RETURN n.Title, n.DivisionId`, session);
        return result;
    } finally {
        session.close();
    }
}

export const totalVotes = async (nameDisplayAs: string) => {
    const cypher = `MATCH (s:Mp)-[r:VOTED_FOR]-(d) WHERE (s.nameDisplayAs = "${nameDisplayAs}") RETURN COUNT(d)`;

    CONNECTION_STRING = `bolt://${process.env.DOCKER_HOST}:7687`;
    // CONNECTION_STRING = `neo4j+s://bb90f2dc.databases.neo4j.io`;
    driver = neo4j.driver(CONNECTION_STRING, neo4j.auth.basic(process.env.NEO4J_USER || '', process.env.NEO4J_PASSWORD || ''));
    const session = driver.session();

    try {
        const result = await runCypher(cypher, session);
        return result;
    } finally {
        session.close();
    }
}

export const votedAyeCount = async (nameDisplayAs: string) => {
    const cypher = `MATCH (s:Mp)-[r:VOTED_FOR]-(d) WHERE (s.nameDisplayAs = "${nameDisplayAs}" AND r.votedAye) RETURN COUNT(*)`;

    CONNECTION_STRING = `bolt://${process.env.DOCKER_HOST}:7687`;
    // CONNECTION_STRING = `neo4j+s://bb90f2dc.databases.neo4j.io`;
    driver = neo4j.driver(CONNECTION_STRING, neo4j.auth.basic(process.env.NEO4J_USER || '', process.env.NEO4J_PASSWORD || ''));
    const session = driver.session();

    try {
        const result = await runCypher(cypher, session);
        return result;
    } finally {
        session.close();
    }
}

export const votedNoCount = async (nameDisplayAs: string) => {
    const cypher = `MATCH (s:Mp)-[r:VOTED_FOR]-(d) WHERE (s.nameDisplayAs = "${nameDisplayAs}" AND NOT r.votedAye) RETURN COUNT(*)`;

    CONNECTION_STRING = `bolt://${process.env.DOCKER_HOST}:7687`;
    // CONNECTION_STRING = `neo4j+s://bb90f2dc.databases.neo4j.io`;
    driver = neo4j.driver(CONNECTION_STRING, neo4j.auth.basic(process.env.NEO4J_USER || '', process.env.NEO4J_PASSWORD || ''));
    const session = driver.session();

    try {
        const result = await runCypher(cypher, session);
        return result;
    } finally {
        session.close();
    }
}

export const voted = async (nameDisplayAs: string) => {

    const cypher = `MATCH (s:Mp)-[r:VOTED_FOR]-(d) WHERE (s.nameDisplayAs = "${nameDisplayAs}") RETURN d.DivisionId, d.Title, d.Date, r.votedAye`;

    CONNECTION_STRING = `bolt://${process.env.DOCKER_HOST}:7687`;
    // CONNECTION_STRING = `neo4j+s://bb90f2dc.databases.neo4j.io`;
    driver = neo4j.driver(CONNECTION_STRING, neo4j.auth.basic(process.env.NEO4J_USER || '', process.env.NEO4J_PASSWORD || ''));
    const session = driver.session();

    try {
        const result = await runCypher(cypher, session);
        return result;
    } finally {
        session.close();
    }
}

export const votedAye = async (nameDisplayAs: string) => {

    const cypher = `MATCH (s:Mp)-[r:VOTED_FOR]-(d) WHERE (s.nameDisplayAs = "${nameDisplayAs}" AND r.votedAye) RETURN d.DivisionId, d.Title, d.Date`;

    CONNECTION_STRING = `bolt://${process.env.DOCKER_HOST}:7687`;
    // CONNECTION_STRING = `neo4j+s://bb90f2dc.databases.neo4j.io`;
    driver = neo4j.driver(CONNECTION_STRING, neo4j.auth.basic(process.env.NEO4J_USER || '', process.env.NEO4J_PASSWORD || ''));
    const session = driver.session();

    try {
        const result = await runCypher(cypher, session);
        return result;
    } finally {
        session.close();
    }
}

export const votedNo = async (nameDisplayAs: string) => {

    const cypher = `MATCH (s:Mp)-[r:VOTED_FOR]-(d) WHERE (s.nameDisplayAs = "${nameDisplayAs}" AND NOT r.votedAye) RETURN d.DivisionId, d.Title, d.Date`;

    CONNECTION_STRING = `bolt://${process.env.DOCKER_HOST}:7687`;
    // CONNECTION_STRING = `neo4j+s://bb90f2dc.databases.neo4j.io`;
    driver = neo4j.driver(CONNECTION_STRING, neo4j.auth.basic(process.env.NEO4J_USER || '', process.env.NEO4J_PASSWORD || ''));
    const session = driver.session();

    try {
        const result = await runCypher(cypher, session);
        return result;
    } finally {
        session.close();
    }
}

export const mostSimilarVotingRecord = async (nameDisplayAs: string) => {

    logger.debug('finding mostSimilarVotingRecord...');

    //find mps with most similar voting records
    const cypher = `MATCH(targetNode: Mp { nameDisplayAs: "${nameDisplayAs}" })
    CALL gds.nodeSimilarity.stream('g1', {
            relationshipWeightProperty: 'votedAyeNumeric'
        })
    YIELD node1, node2, similarity
    WITH gds.util.asNode(node1) AS mp1, gds.util.asNode(node2) AS mp2, similarity    
    RETURN mp1.nameDisplayAs, mp2.nameDisplayAs, mp2.partyName, similarity
    ORDER BY similarity DESCENDING, mp1.nameDisplayAs, mp2.nameDisplayAs
    LIMIT 20`;

    CONNECTION_STRING = `bolt://${process.env.DOCKER_HOST}:7687`;
    // CONNECTION_STRING = `neo4j+s://bb90f2dc.databases.neo4j.io`;
    driver = neo4j.driver(CONNECTION_STRING, neo4j.auth.basic(process.env.NEO4J_USER || '', process.env.NEO4J_PASSWORD || ''));
    const session = driver.session();

    try {
        const result = await runCypher(cypher, session);
        return result;
    } finally {
        session.close();
    }

}

export const mostSimilarVotingRecordwithinParty = async (nameDisplayAs: string, partyName: string) => {

    logger.debug('finding mostSimilarVotingRecord...');

    //find mps with most similar voting records
    const cypher = `CALL gds.nodeSimilarity.stream('g1', {
        relationshipWeightProperty: 'votedAyeNumeric'
    })
    YIELD node1, node2, similarity 
    WITH gds.util.asNode(node1) AS mp1, gds.util.asNode(node2) AS mp2, similarity 
    WHERE (mp1.nameDisplayAs = "${nameDisplayAs}" OR mp2.nameDisplayAs = "${nameDisplayAs})"
    AND mp2.partyName = "${partyName}"
    RETURN mp1.nameDisplayAs, mp2.nameDisplayAs, similarity
    ORDER BY similarity DESCENDING, mp1, mp2`;


    CONNECTION_STRING = `bolt://${process.env.DOCKER_HOST}:7687`;
    // CONNECTION_STRING = `neo4j+s://bb90f2dc.databases.neo4j.io`;
    driver = neo4j.driver(CONNECTION_STRING, neo4j.auth.basic(process.env.NEO4J_USER || '', process.env.NEO4J_PASSWORD || ''));
    const session = driver.session();

    try {
        const result = await runCypher(cypher, session);
        return result;
    } finally {
        session.close();
    }

}

export const mostSimilarVotingRecordOutsideOfParty = async (nameDisplayAs: string, partyName: string) => {

    logger.debug('finding mostSimilarVotingRecord...');

    //find mps with most similar voting records
    const cypher = `CALL gds.nodeSimilarity.stream('g1', {
        relationshipWeightProperty: 'votedAyeNumeric'
    })
    YIELD node1, node2, similarity 
    WITH gds.util.asNode(node1) AS mp1, gds.util.asNode(node2) AS mp2, similarity 
    WHERE (mp1.nameDisplayAs = "${nameDisplayAs}" OR mp2.nameDisplayAs = "${nameDisplayAs})"
    AND (mp1.partyName <> "${partyName}" OR mp2.partyName <> "${partyName}")    
    RETURN mp1.nameDisplayAs, mp2.nameDisplayAs, similarity
    ORDER BY similarity DESCENDING, mp1, mp2`;


    CONNECTION_STRING = `bolt://${process.env.DOCKER_HOST}:7687`;
    // CONNECTION_STRING = `neo4j+s://bb90f2dc.databases.neo4j.io`;
    driver = neo4j.driver(CONNECTION_STRING, neo4j.auth.basic(process.env.NEO4J_USER || '', process.env.NEO4J_PASSWORD || ''));
    const session = driver.session();

    try {
        const result = await runCypher(cypher, session);
        return result;
    } finally {
        session.close();
    }

}

export const setupNeo = async () => {

    CONNECTION_STRING = `bolt://${process.env.DOCKER_HOST}:7687`;
    // CONNECTION_STRING = `neo4j+s://bb90f2dc.databases.neo4j.io`;

    driver = neo4j.driver(CONNECTION_STRING, neo4j.auth.basic(process.env.NEO4J_USER || '', process.env.NEO4J_PASSWORD || ''));
    const session = driver.session();

    logger.debug(`NEO URL ${CONNECTION_STRING + process.env.NEO4J_USER + " " + process.env.NEO4J_PASSWORD}`);

    try {
        let result;
        // result = await runCypher(`CREATE CONSTRAINT relUnique FOR ()-[r:VOTED_FOR]-() REQUIRE (r.votedAye) IS UNIQUE`, session);
        result = await runCypher(`CREATE CONSTRAINT FOR (mp:Mp) REQUIRE mp.id IS UNIQUE`, session);
        result = await runCypher(`CREATE CONSTRAINT FOR (donar:Donar) REQUIRE donar.donar IS UNIQUE`, session);
        result = await runCypher(`CREATE CONSTRAINT FOR (party:Party) REQUIRE party.partyName IS UNIQUE`, session);
        // result = await runCypher(`CREATE CONSTRAINT voted_for_unique ON (mp:Mp)-[:VOTED_FOR]->(division:Division) REQUIRE (mp.id <> division.id)`, session);
    } catch (error) {
        //contraint already exists so proceed
    } finally {
        session.close();
    }

    logger.debug('NEO setup complete');

}

export const setupDataScience = async () => {

    CONNECTION_STRING = `bolt://${process.env.DOCKER_HOST}:7687`;
    // CONNECTION_STRING = `neo4j+s://bb90f2dc.databases.neo4j.io`;

    driver = neo4j.driver(CONNECTION_STRING, neo4j.auth.basic(process.env.NEO4J_USER || '', process.env.NEO4J_PASSWORD || ''));
    const session = driver.session();

    try {
        await runCypher(`CALL gds.graph.drop('similarityGraph',false) YIELD graphName`, session);
        await runCypher(`CALL gds.graph.project('similarityGraph', {Mp: {}, Division: { properties: 'DateNumeric' }}, ['VOTED_FOR'],  { relationshipProperties: ['votedAyeNumeric'] })`, session);
    } catch (error) {
        //contraint already exists so proceed
    }

    session.close();

}

export const cleanUp = () => {
    driver.close();
}

export const getPartyMpCounts = async () => {

    const cypher: string = `MATCH (n:Mp) RETURN n.partyName, COUNT (n.partyName) as mpsCount`;

    const session = driver.session();
    try {
        await runCypher(cypher, session);
        const result = await session.run(cypher);
        return result;
    } catch (error: any) {
        if (error.code !== "Neo.ClientError.Schema.ConstraintValidationFailed") {
            logger.error(`Error querying neo ${error}`);
        }
    }
}


export const createPartyNode = async (party: any) => {

    const cypher: string = `CREATE (party:Party {
        partyName: "${party.name}",
        mpsCount: ${party.mpsCount}
      });`

    const session = driver.session();
    try {
        await runCypher(cypher, session);
    } catch (error: any) {
        if (error.code !== "Neo.ClientError.Schema.ConstraintValidationFailed") {
            logger.error(`Error adding to neo ${error}`);
        }
    }

}

export const createMpNode = async (mp: Mp) => {

    const partyName = mp.latestParty.name.includes("abour") ? "Labour" : mp.latestParty.name;

    const cypher: string =
        `CREATE (mp:Mp {
        id: ${mp.id},
        nameListAs: "${mp.nameListAs}",
        nameDisplayAs: "${mp.nameDisplayAs}",
        nameFullTitle: "${mp.nameFullTitle}",                
        partyId: "${mp.latestParty.id}",
        partyName: "${partyName}",
        gender: "${mp.gender}",        
        partyBackgroundColour: "${mp.latestParty.backgroundColour}",
        partyForegroundColour: "${mp.latestParty.foregroundColour}",
        partyIsLordsMainParty: "W${mp.latestParty.isLordsMainParty}",
        partyIsLordsSpiritualParty: "${mp.latestParty.isLordsSpiritualParty}",        
        partyIsIndependentParty: "${mp.latestParty.isIndependentParty}",
        house: ${mp.latestHouseMembership.house},
        membershipFrom: "${mp.latestHouseMembership.membershipFrom}",
        membershipStartDate: datetime("${mp.latestHouseMembership.membershipStartDate}")
      });`

    try {
        const session = driver.session();
        const result = await session.run(cypher);
        // logger.debug('created ', result);

    } catch (error: any) {
        if (error.code !== "Neo.ClientError.Schema.ConstraintValidationFailed") {
            logger.error(`Error adding to neo ${error}`);
        }
    }

}

export const createDonar = async (donar: any) => {

    const nodeCypher: string = `CREATE (donar:Donar {
        donar: "${donar.DonorName}",                                
        accountingUnitName: "${donar.AccountingUnitName}",
        donorStatus: "${donar.DonorStatus}",
        postcode: "${donar.Postcode}"
        })`;

    const relCypher = `
    MATCH (donar:Donar {donar: "${donar.DonorName}"} )  
    MATCH (party:Party {partyName: "${donar.Party}"} )     
    CREATE (donar)-[:DONATED_TO { natureOfDonation: "${donar.NatureOfDonation}", donationType: "${donar.DonationType}", ecRef: "${donar.ECRef}", acceptedDate: datetime("${donar.AcceptedDate}"), receivedDate: datetime("${donar.ReceivedDate}"), amount: ${donar.Value} } ]->(party)`;

    const session = driver.session();
    try {
        const result = await runCypher(nodeCypher, session);        
    } catch (error: any) {
        if (error.code !== "Neo.ClientError.Schema.ConstraintValidationFailed") {
            logger.error(`Error adding donar node to neo ${error}`);
            logger.error(nodeCypher);
        }
    }

    try {
        const result = await runCypher(relCypher, session);        
    } catch (error: any) {
        if (error.code !== "Neo.ClientError.Schema.ConstraintValidationFailed") {
            logger.error(`Error adding donar relationship to neo ${error}`);
            logger.error(relCypher);
        }
    }

}

export const createDonarNode = async (donar: any) => {

    const cypher: string = `CREATE (donar:Donar {
        donar: "${donar.DonorName}",
        ecRef: "${donar.ECRef}",
        partyName: "${donar.Party}",        
        amount: ${donar.Value},
        acceptedDate: datetime("${donar.AcceptedDate}"),
        receivedDate: datetime("${donar.ReceivedDate}"),                
        accountingUnitName: "${donar.AccountingUnitName}",
        donorStatus: "${donar.DonorStatus}",
        postcode: "${donar.Postcode}",
        donationType: "${donar.DonationType}",
        postcode: "${donar.Postcode}",
        natureOfDonation: "${donar.NatureOfDonation}",
        postcode: "${donar.Postcode}"             
        })`;

    try {
        const session = driver.session();
        const result = await session.run(cypher);
    } catch (error: any) {
        if (error.code !== "Neo.ClientError.Schema.ConstraintValidationFailed") {
            logger.error(`Error adding to neo ${error}`);
            logger.error(cypher);

        }
    }
}

export const createDonarRelationships = async () => {

    logger.info(`Createding donar relationships`);

    const cypher = `MATCH (party:Party) MATCH (donar:Donar {partyName: party.partyName}) CREATE (donar)-[:DONATED_TO]->(party)`;

    const session = driver.session();
    try {
        const result = await runCypher(cypher, session);
    } catch (error: any) {
        if (error.code !== "Neo.ClientError.Schema.ConstraintValidationFailed") {
            logger.error(`Error adding to neo ${error}`);
        }
    }

    logger.info(`Donar relationships created`);
}

export const createDivisionNode = async (division: Division) => {

    const dateNumeric = new Date(division.Date);

    const cypher: string = `CREATE (division:Division {
        DivisionId: ${division.DivisionId},
        Date: datetime("${division.Date}"),
        DateNumeric: ${dateNumeric.getTime()},
        PublicationUpdated: datetime("${division.PublicationUpdated}"),
        Number: ${division.Number},
        IsDeferred: ${division.IsDeferred},        
        Title: "${division.Title}",
        AyeCount: ${division.AyeCount},
        NoCount: ${division.NoCount},
        Category: "${division.category}"
        })`;

    try {
        const session = driver.session();
        const result = await session.run(cypher);
    } catch (error: any) {
        if (error.code !== "Neo.ClientError.Schema.ConstraintValidationFailed") {
            logger.error(`Error adding to neo ${error}`);
        }
    }

}

export const createParyRelationships = async () => {

    logger.info(`Creating pary relationships`);

    const cypher = `MATCH (party:Party) MATCH (mp:Mp {partyName: party.partyName}) CREATE (mp)-[:MEMBER_OF]->(party)`;

    const session = driver.session();
    try {
        const result = await runCypher(cypher, session);
    } catch (error: any) {
        if (error.code !== "Neo.ClientError.Schema.ConstraintValidationFailed") {
            logger.error(`Error adding to neo ${error}`);
        }
    }
}

export const createVotedForDivision = async (votedFor: VotedFor) => {

    const cypher: string = `MATCH (mp:Mp {id: ${votedFor.mpId}}), (division:Division {DivisionId: ${votedFor.divisionId}}) CREATE (mp)-[:VOTED_FOR {votedAye: ${votedFor.votedAye}, votedAyeNumeric: ${Number(votedFor.votedAye)} }]->(division);`;

    try {
        const session = driver.session();
        // logger.debug(cypher);            
        const result = await session.run(cypher);

    } catch (error: any) {
        if (error.code !== "Neo.ClientError.Schema.ConstraintValidationFailed") {
            logger.error(`Error adding to neo ${error}`);
        }
    }

}