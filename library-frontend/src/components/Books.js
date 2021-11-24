import React, { useState } from 'react'
import { useQuery } from '@apollo/client'
import { ALL_BOOKS } from '../queries'

const Books = (props) => {
  const [genreFilter, setGenreFilter] = useState('')
  const result = useQuery(ALL_BOOKS)
  
  if (!props.show) {
    return null
  }

  if (result.loading)  {
    return <div>loading...</div>
  }

  let books = result.data.allBooks

  const genres = []
  if (books) {
    books.map(book => 
      book.genres.map(genre => {
        if (genres.includes(genre)) {
          return null
        }
        return genres.push(genre)
      }
    ))
  }

  if (genreFilter) {
    books = books.filter(book => 
      book.genres.includes(genreFilter))
  }

  return (
    <div>
      <h2>books</h2>

      <table>
        <tbody>
          <tr>
            <th></th>
            <th>
              author
            </th>
            <th>
              published
            </th>
          </tr>
          {books
            .map(a =>
              <tr key={a.title}>
                <td>{a.title}</td>
                <td>{a.author.name}</td>
                <td>{a.published}</td>
              </tr>
          )}
        </tbody>
      </table>
      <div>
        {genres.map(genre =>
          <button key={genre} onClick={() => setGenreFilter(genre)}>{genre}</button>
        )}
        <button onClick={() => setGenreFilter('')}>reset filter</button>
      </div>
    </div>
  )
}

export default Books