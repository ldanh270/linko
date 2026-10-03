// NOTE: Tests must opt into their own in-memory MongoDB connection explicitly.
delete process.env.MONGODB_CONNECTION_STRING
process.env.NODE_ENV = "test"
