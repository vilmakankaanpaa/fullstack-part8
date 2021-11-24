import React from "react"
import { useQuery } from '@apollo/client'
import { ALL_BOOKS, MY_PROFILE } from '../queries'

const Recommend = ({ show, setError }) => {

  const result = useQuery(ALL_BOOKS)
  const userResult = useQuery(MY_PROFILE, {
    onError: (error) => {
      setError(error.graphQLErrors[0].message)
    }})


  if (userResult.loading)  {
    return <div>loading...</div>
  }

  if (!show) {
    return null
  }

  let favorite = ''
  if (userResult.data) {
    favorite = userResult.data.me.favoriteGenre
    console.log(favorite)
  }

  const books = result.data.allBooks.filter(book => book.genres.includes(favorite))

  //books = books.filter(book => book.genres.includes(favoriteGenre))

  return (
    <div>
      <h2>recommendations</h2>
      <p>books based on your favorite genre <strong>"{favorite}"</strong></p>
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
    </div>
  )
}

export default Recommend