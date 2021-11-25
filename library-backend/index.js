const { ApolloServer, UserInputError, AuthenticationError, gql } = require('apollo-server-express')
const { ApolloServerPluginDrainHttpServer } = require('apollo-server-core')
const express = require('express')
const http = require('http')

const { execute, subscribe } = require('graphql')
const { SubscriptionServer } = require('subscriptions-transport-ws')
const { makeExecutableSchema } = require ('@graphql-tools/schema')
const { PubSub } = require('graphql-subscriptions')
const pubsub = new PubSub()

const mongoose = require('mongoose')
const Book = require('./models/book')
const Author = require('./models/author')
const User = require('./models/user')
const jwt = require('jsonwebtoken')

const MONGODB_URI = 'mongodb+srv://fullstack:ltls09g3@testcluster.y7qrf.mongodb.net/library-app?retryWrites=true&w=majority'
const JWT_SECRET = 'NEED_HERE_A_SECRET_KEY'

console.log('connecting to', MONGODB_URI)

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('connected to MongoDB')
  })
  .catch((error) => {
    console.log('error connection to MongoDB:', error.message)
  })

const typeDefs = gql`

  type Book {
    title: String!
    published: Int!
    author: Author!
    genres: [String!]!
    id: ID!
  }

  type Author {
    name: String!
    born: Int
    id: ID!
    bookCount: Int
  }

  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }
  
  type Token {
    value: String!
  }  

  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book!]!
    allAuthors: [Author!]!
    me: User,
    allUsers: [User!]!
  }

  type Mutation {
    addBook(
      title: String!
      author: String!
      published: Int!
      genres: [String!]!
    ): Book,
    editAuthor(
      name: String!
      setBornTo: Int! 
    ): Author,
    createUser(
      username: String!
      favoriteGenre: String!
    ): User
    login(
      username: String!
      password: String!
    ): Token
  }

  type Subscription {
    bookAdded: Book!
  }   
`

const resolvers = {
  Query: {
    bookCount: () => Book.collection.countDocuments(),
    authorCount: () => Author.collection.countDocuments(),
    allBooks: async (root, args) => {
      const { author, genre } = args

      if (author && genre) {
        const foundAuthor = await Author.findOne({ name: args.author })
        return Book.find({author: foundAuthor, genres: {$in: genre}}).populate('author')
      }

      if (author) {
        const foundAuthor = await Author.findOne({ name: args.author })
        if (!foundAuthor) {
          return null
        }
        return await Book.find({ author: foundAuthor }).populate('author')
      }  

      if (genre) {
        return await Book.find({ genres: {$in: genre} }).populate('author')
      }

      return await Book.find({}).populate('author')
      
    },
    allAuthors: async () => { 
      return await Author.find({})
    },
    me: (root, args, context) => {
      console.log('me - context', context)
      const currentUser = context.currentUser
      if (!currentUser) {
        throw new AuthenticationError("not authenticated")
      }
      console.log(currentUser)
      return currentUser
    },
    allUsers: async () => {
      return await User.find({})
    }
  },
  Author: {
    bookCount: async (root) => { 
      return await Book.find({ author: root }).countDocuments()
    }
  },
  Mutation: {
    addBook: async (root, args, context) => {
      const currentUser = context.currentUser

      if (!currentUser) {
        throw new AuthenticationError("not authenticated")
      }

      let author = await Author.findOne({ name: args.author })

      if (!author) {
        author = new Author({
          name: args.author, 
          born: null
        })
        try {
          await author.save()
        } catch (error) {
          throw new UserInputError(error.message, {
            invalidArgs: args,
        })
      }
      }
      const book = new Book({ ...args, author })
      try {
        await book.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }

      pubsub.publish('BOOK_ADDED', { bookAdded: book })

      return book
    },
    editAuthor: async (root, args, context) => {
      const currentUser = context.currentUser

      if (!currentUser) {
        throw new AuthenticationError("not authenticated")
      }

      const author = await Author.findOne({ name: args.name })
      if (!author) {
        return null
      }
      author.born = args.setBornTo
      try {
        await author.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }
      return author
    },
    createUser: (root, args) => {
      const user = new User({ ...args })
  
      return user.save()
        .catch(error => {
          throw new UserInputError(error.message, {
            invalidArgs: args,
          })
        })
    },
    login: async (root, args) => {
      console.log('logging in....')
      const user = await User.findOne({ username: args.username })
  
      if ( !user || args.password !== 'secret' ) {
        throw new UserInputError("wrong credentials")
      }
  
      const userForToken = {
        username: user.username,
        id: user._id,
      }

      const token = await jwt.sign(userForToken, JWT_SECRET)
  
      return { value: token }
    },
  },
  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterator(['BOOK_ADDED'])
    },
  },
}

// const server = new ApolloServer({
//   typeDefs,
//   resolvers,
//   context: async ({ req }) => {
//     const auth = req ? req.headers.authorization : null
//     if (auth && auth.toLowerCase().startsWith('bearer ')) {
//       const decodedToken = jwt.verify(
//         auth.substring(7), JWT_SECRET
//       )
//       const currentUser = await User.findById(decodedToken.id)
//       return { currentUser }
//     }
//   }
// })

// server.listen().then(({ url }) => {
//   console.log(`Server ready at ${url}`)
// })

const context = async ({ req }) => {
  const auth = req ? req.headers.authorization : null
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    const decodedToken = jwt.verify(
      auth.substring(7), JWT_SECRET
    )
    const currentUser = await User.findById(decodedToken.id)
    return { currentUser }
  }
}

async function startApolloServer() {
  // Required logic for integrating with Express
  const app = express()
  const httpServer = http.createServer(app)

  const schema = makeExecutableSchema({ typeDefs, resolvers })

  const subscriptionServer = SubscriptionServer.create({
    // This is the `schema` we just created.
    schema,
    // These are imported from `graphql`.
    execute,
    subscribe,
  }, {
      // This is the `httpServer` we created in a previous step.
      server: httpServer,
      // Pass a different path here if your ApolloServer serves at
      // a different path.
      path: '/',
  })

  // Same ApolloServer initialization as before, plus the drain plugin.
  const server = new ApolloServer({
    schema,
    context,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              subscriptionServer.close();
            }
          };
        }
      }
    ],
  });
  

  // More required logic for integrating with Express
  await server.start();
  server.applyMiddleware({
    app,

    // By default, apollo-server hosts its GraphQL endpoint at the
    // server root. However, *other* Apollo Server packages host it at
    // /graphql. Optionally provide this to match apollo-server.
    path: '/'
  });

  // Modified server startup
  new Promise(resolve => httpServer.listen({ port: 4000 }, resolve))
  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`)
}

startApolloServer()