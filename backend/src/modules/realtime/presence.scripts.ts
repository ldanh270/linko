/** Allocate a stable offset atomically; reads never invoke this script. */
export const ALLOCATE_PRESENCE_OFFSET = `
local offset = redis.call('HGET', KEYS[1], ARGV[1])
if not offset then
  offset = redis.call('INCR', KEYS[2])
  redis.call('HSET', KEYS[1], ARGV[1], offset)
end
return tonumber(offset)
`

/** Atomically prune leases, mutate one socket and update the user's bitmap/deadline. */
export const UPDATE_PRESENCE_SESSION = `
local offset = redis.call('HGET', KEYS[1], ARGV[1])
if not offset and ARGV[3] ~= 'connect' then return 0 end
if not offset then
  offset = redis.call('INCR', KEYS[2])
  redis.call('HSET', KEYS[1], ARGV[1], offset)
end
redis.call('ZREMRANGEBYSCORE', KEYS[4], '-inf', ARGV[4])
if ARGV[3] == 'connect' then redis.call('ZADD', KEYS[4], ARGV[5], ARGV[2]) end
if ARGV[3] == 'disconnect' then redis.call('ZREM', KEYS[4], ARGV[2]) end
local earliest = redis.call('ZRANGE', KEYS[4], 0, 0, 'WITHSCORES')
local online = 0
if #earliest > 0 then
  online = 1
  redis.call('ZADD', KEYS[5], earliest[2], ARGV[1])
else
  redis.call('ZREM', KEYS[5], ARGV[1])
end
local previous = redis.call('SETBIT', KEYS[3], offset, online)
if previous == online then return 0 end
if online == 1 then return 1 else return -1 end
`
