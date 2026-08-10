import { useState, useEffect } from 'react'
import * as auth from '../services/auth'
import '../styles/schemes.css'

function Eligibility() {
  const [form, setForm] = useState({
    age: "",
    income: "",
    gender: "",
    category: "",
    occupation: "",
    disability: "",
  })

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await auth.me()

        if (response?.user?.citizenProfile) {
          const profile = response.user.citizenProfile

          setForm({
            age: profile.age || "",
            income: profile.income || "",
            gender: profile.gender || "",
            category: profile.category || "",
            occupation: profile.occupation || "",
            disability: profile.disability || "",
          })
        }
      } catch (error) {
        console.log("User is not logged in or profile unavailable")
      }
    }

    loadProfile()
  }, [])

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    console.log("Citizen profile:", form)

    alert("Eligibility check submitted!")
  }

  return (
    <div className="eligibility-page">
      <h1>Check Your Eligibility</h1>

      <p>
        Answer a few questions to find government schemes and services
        you may be eligible for.
      </p>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Age</label>
          <input
            type="number"
            name="age"
            value={form.age}
            onChange={handleChange}
            placeholder="Enter your age"
          />
        </div>

        <div>
          <label>Annual Family Income</label>
          <input
            type="number"
            name="income"
            value={form.income}
            onChange={handleChange}
            placeholder="Enter annual income"
          />
        </div>

        <div>
          <label>Gender</label>
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label>Category</label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
          >
            <option value="">Select category</option>
            <option value="general">General</option>
            <option value="obc">OBC</option>
            <option value="sc">SC</option>
            <option value="st">ST</option>
          </select>
        </div>

        <div>
          <label>Occupation</label>
          <input
            type="text"
            name="occupation"
            value={form.occupation}
            onChange={handleChange}
            placeholder="Enter occupation"
          />
        </div>

        <div>
          <label>Person with Disability?</label>
          <select
            name="disability"
            value={form.disability}
            onChange={handleChange}
          >
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>

        <button type="submit">
          Find Eligible Schemes
        </button>
      </form>
    </div>
  )
}

export default Eligibility