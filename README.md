# mps

Requires neo4 instance 

docker run --publish=7474:7474 --publish=7687:7687 --volume=$HOME/neo4j/data:/data --env NEO4J_PLUGINS='["graph-data-science"]' -d neo4j

//ssh into container
winpty docker exec -it 0394c5 bash
//stop and dump (need to find a way to not stop the container when the database stops)
neo4j stop; neo4j-admin database dump neo4j

MATCH (s:Division)-[r]-(d) WHERE s.DivisionId = 981 AND NOT r.votedAye RETURN *
MATCH (s:Mp)-[r]-(d) WHERE s.nameFullTitle STARTS WITH 'B' AND NOT r.votedAye RETURN s,r,d

docker build . -t mps-service/1
docker run -p 8080:8080 -d mps-service/1

CALL gds.graph.drop('g1',false) YIELD graphName

CALL gds.graph.project('g1', ['Mp', 'Division'], ['VOTED_FOR'],  { relationshipProperties: ['votedAyeNumeric'] })

//find mps with most similar voting records 
CALL gds.nodeSimilarity.stream('g1', {
  relationshipWeightProperty: 'votedAyeNumeric',
  topK: 100
})
YIELD node1, node2, similarity
WITH gds.util.asNode(node1) AS mp1, gds.util.asNode(node2) AS mp2, similarity
WHERE (mp1.nameDisplayAs = "Ms Diane Abbott" OR mp2.nameDisplayAs = "Ms Diane Abbott")
AND (mp1.partyName <> "Conservative" OR mp2.partyName <> "Conservative")
RETURN mp1.nameDisplayAs, mp2.nameDisplayAs, mp2.partyName, similarity
ORDER BY similarity DESCENDING, mp1.nameDisplayAs, mp2.nameDisplayAs
LIMIT 20



//compare 2 mps on voting for a specific division
MATCH (s:Mp)-[r]-(d) WHERE (s.nameDisplayAs = "Ms Diane Abbott" OR s.nameDisplayAs = "Nigel Adams") AND d.DivisionId = 1446 RETURN s,d


//compare 2 mps voting records
MATCH (m1:Mp {nameDisplayAs: "Ms Diane Abbott"})
MATCH (m2:Mp {nameDisplayAs: "Nigel Adams"})
OPTIONAL MATCH (m1)-[r1]->(d1:Division)
OPTIONAL MATCH (m2)-[r2]->(d1:Division)
WHERE r1.votedAye <> r2.votedAye
RETURN
m1.nameDisplayAs AS m1,
m2.nameDisplayAs AS m2,
d1.Title AS division,
d1.DivisionId AS divisionId,
r1.votedAye AS m1VotedAye,
r2.votedAye AS m2VotedAye


//delete a node and all its relationships
MATCH (n:Mp {nameDisplayAs: 'Ms Diane Abbott'})
DETACH DELETE n