import React, { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { ALL_AUTHORS, ALL_BOOKS, EDIT_AUTHOR } from '../queries'

const SetBirthYear = ({ setError, setPage, show }) => {
  const [name, setName] = useState('')
  const [born, setBorn] = useState('')

  const [ editAuthor ] = useMutation(EDIT_AUTHOR, {
    onError: (error) => {
      setError(error.graphQLErrors[0].message)
    },
    refetchQueries: [  {query: ALL_BOOKS}, {query: ALL_AUTHORS} ]
  })

  const result = useQuery(ALL_AUTHORS)
  if (result.loading) {
    return null
  }
  const authors = result.data.allAuthors

  if (!show) {
    return null
  }

  const submit = async (event) => {
    event.preventDefault()

    editAuthor({ 
      variables: { name, born: Number(born) } 
    })

    setName('')
    setBorn('')
    setPage('authors')
  }

  return (
    <div>
      <h2>Set birthyear</h2>
      <form onSubmit={submit}>
        <div>
          name
          <select value={name} onChange={({ target }) => setName(target.value)}>
            {authors.map(author => 
              <option key={author.name} value={author.name}>{author.name}</option>
            )}
          </select>
        </div>
        <div>
          born
          <input
            value={born}
            onChange={({ target }) => setBorn(target.value)}
          />
        </div>
        <button type='submit'>update author</button>
      </form>
    </div>
  )

}

export default SetBirthYear