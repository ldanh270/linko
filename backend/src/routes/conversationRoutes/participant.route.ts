import express from "express"

const participantRoutes = express.Router({ mergeParams: true })

// List of members in specific conversation
participantRoutes.get("/", () => {})

// Add members into group
participantRoutes.post("/", () => {})

// Edit members in group
participantRoutes.put("/:userId", () => {})

// Delete members from group
participantRoutes.delete("/:userId", () => {})

export default participantRoutes
