const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const app = express()
app.use(express.json())

const databasePath = path.join(__dirname, 'covid19IndiaPortal.db')
let database = null

const intializeDBAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () =>
      console.log('Server is Running at http://localhost:3000/'),
    )
  } catch (error) {
    console.log(`ERROR: ${error.message}`)
    process.exit(1)
  }
}

intializeDBAndServer()

// API 1
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `
                          SELECT 
                            *
                          FROM 
                            user
                          WHERE username = '${username}';`
  const databaseUser = await database.get(selectUserQuery)

  if (databaseUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatches = await bcrypt.compare(
      password,
      databaseUser.password,
    )
    if (isPasswordMatches !== true) {
      response.status(400)
      response.send('Invalid password')
    } else {
      const payload = {
        username: username,
      }
      const jwtToken = jwt.sign(payload, 'ksajklajd')
      response.send({jwtToken})
    }
  }
})

// Middleware Authencation function

const authenticateToken = (request, response, next) => {
  console.log('Authenticate Token')

  let jwtToken
  const authHeader = request.headers['authorization']

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'ksajklajd', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}

// API 2

app.get('/states/', authenticateToken, async (request, response) => {
  const getStatesQuery = `
                          SELECT 
                            state_id AS stateId ,
                            state_name AS stateName ,
                            population
                          FROM 
                            state;`

  const statesArray = await database.all(getStatesQuery)
  response.send(statesArray)
})

// API 3

app.get('/states/:stateId/', authenticateToken, async (request, response) => {
  const {stateId} = request.params
  const getStatesQuery = `
                          SELECT 
                            state_id AS stateId ,
                            state_name AS stateName ,
                            population
                          FROM 
                            state
                          WHERE
                            state_id = '${stateId}';`

  const state = await database.get(getStatesQuery)
  response.send(state)
})

// API 4

app.post('/districts/', authenticateToken, async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const insertNewDistrictQuery = `
                                  INSERT INTO
                                    district (district_name, state_id, cases, cured, active, deaths)
                                  VALUES (
                                    '${districtName}',
                                    '${stateId}',
                                    '${cases}',
                                    '${cured}',
                                    '${active}',
                                    '${deaths}'
                                  );`
  await database.run(insertNewDistrictQuery)
  response.send('District Successfully Added')
})

// API 5

app.get(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const getDistrictQuery = `
                          SELECT 
                            district_id AS districtId ,
                            district_name AS districtName ,
                            state_id AS stateId ,
                            cases ,
                            cured ,
                            active ,
                            deaths
                          FROM
                            district
                          WHERE
                            district_id = '${districtId}';`
    const district = await database.get(getDistrictQuery)
    response.send(district)
  },
)

// API 6

app.delete(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const deleteDistrictQuery = `
                          DELETE FROM
                            district
                          WHERE
                            district_id = '${districtId}';`
    await database.run(deleteDistrictQuery)
    response.send('District Removed')
  },
)

// API 7
app.put(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const {districtName, stateId, cases, cured, active, deaths} = request.body
    const updateDistrictQuery = `
                              UPDATE 
                                district
                              SET
                                district_name = '${districtName}',
                                state_id = '${stateId}',
                                cases = '${cases}',
                                cured = '${cured}',
                                active = '${active}',
                                deaths = '${deaths}'
                              WHERE 
                                district_id = ${districtId};`
    await database.run(updateDistrictQuery)
    response.send('District Details Updated')
  },
)

// API 8

app.get(
  '/states/:stateId/stats/',
  authenticateToken,
  async (request, response) => {
    const {stateId} = request.params
    const getStatsOfStates = `
                                  SELECT 
                                    SUM(cases) AS totalCases,
                                    SUM(cured) AS totalCured,
                                    SUM(active) AS totalActive,
                                    SUM(deaths) AS totalDeaths
                                  FROM 
                                    district
                                  WHERE
                                    state_id = ${stateId};`
    const stats = await database.get(getStatsOfStates)
    response.send(stats)
  },
)

module.exports = app
