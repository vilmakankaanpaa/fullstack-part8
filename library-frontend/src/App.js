import React, { useState } from 'react'
import { useApolloClient } from '@apollo/client'

import Authors from './components/Authors'
import Books from './components/Books'
import NewBook from './components/NewBook'
import UpdateAuthor from './components/UpdateAuthor'
import LoginForm from './components/LoginForm'
import Recommend from './components/Recommend'


const Notify = ({ errorMessage }) => {
  if ( !errorMessage ) {
    return null
  }

  return (
    <div style={{color: 'red'}}>
      {errorMessage}
    </div>
  )
}

let triedToFetch = false

const App = () => {
  const [page, setPage] = useState('authors')
  const [errorMessage, setErrorMessage] = useState(null)
  const [token, setToken] = useState(null)


  if (!token && !triedToFetch) {
    try {
          triedToFetch = true
      const token = localStorage.getItem('library-user-token')
      setToken(token)
    } catch {
      console.log('no token')
    }
  }

  const client = useApolloClient()

  const notify = (message) => {
    setErrorMessage(message)
    setTimeout(() => {
      setErrorMessage(null)
    }, 5000)
  }

  const logout = () => {
    localStorage.clear()
    client.resetStore()
    setToken(null)
  }

  return (
    <div>
      <div>
        <button onClick={() => setPage('authors')}>authors</button>
        <button onClick={() => setPage('books')}>books</button>
        {token && <>
          <button onClick={() => setPage('add')}>add book</button>
          <button onClick={() => setPage('update-author')}>update author</button>
          <button onClick={() => setPage('recommend')}>recommend</button>
          <button onClick={() => logout()}>logout</button>
        </>}
        {!token && <button onClick={() => setPage('login')}>login</button>}
      </div>

      <Notify errorMessage={errorMessage} />

      <Authors
        show={page === 'authors'}
      />

      <Books
        show={page === 'books'}
      />

      <NewBook
        show={page === 'add'}
        setError={notify}
      />

      <UpdateAuthor
        show={page === 'update-author'}
        setPage={setPage}
        setError={notify}
      />

      <Recommend
        show={page === 'recommend'}
        setError={notify}
      />

      <LoginForm
        show={page === 'login'}
        setToken={setToken}
        setError={notify}
        setPage={setPage}
      />

    </div>
  )
}

export default App