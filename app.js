const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')

const app = express()
const dbpath = path.join(__dirname, 'userData.db')
app.use(express.json())
let db = null

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost/3000/')
    })
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

const validPassword = password => {
  return password.length > 4
}

app.post('/register', async (request, response) => {
  const {username, name, password, gender, location} = request.body
  const hashedPassword = await bcrypt.hash(password, 10)
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`
  const dataBaseUser = await db.get(selectUserQuery)

  if (dataBaseUser === undefined) {
    const createUserQuery = `
  INSERT INTO
    user (username, name, password, gender, location)
  VALUES 
    (
      '${username}',
      '${name}',
      '${hashedPassword}',
      '${gender}',
      '${location}'
    );`
    if (validPassword(password)) {
      await db.run(createUserQuery)
      response.send('User created successfully')
    } else {
      response.status(400)
      response.send('Password is too short')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

app.post('/login', async (request, response) => {
  const {username, password} = request.body
  const selectUser = `SELECT * FROM user WHERE username = '${username}';`
  const dbUser = await db.get(selectUser)

  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched === true) {
      response.send('Login success!')
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

app.put('/change-password', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`
  const dbUser = await db.get(selectUserQuery)

  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(oldPassword, dbUser.password)
    if (isPasswordMatched === true) {
      if (validPassword(newPassword)) {
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        const updatePassword = `
        UPDATE 
          user 
        SET 
          password = '${hashedPassword}' 
        WHERE 
          username = '${username}';`
        const user = await db.run(updatePassword)
        response.status(200)
        response.send('Password updated')
      } else {
        response.status(400)
        response.send('Password is too short')
      }
    } else {
      response.status(400)
      response.send('Invalid current password')
    }
  }
})

module.exports = app
