const {v4: uuidv4}= require('uuid')

// in-memory session store - leacred on server restart

const sessions = new Map()

function createSession(){
        const id = uuidv4()
        const session ={
                id, 
                title: 'New Chat',
                messages:[],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
        }
        sessions.set(id, session)
        return session
}

function getSession(id){
        return sessions.get(id)|| null
}

function getAllSessions(){
        return Array.from(sessions.values())
        .sort((a,b)=> new Date(b.updatedAt)- new Date(a.updatedAt))
}

function updateSession(id, changes){
        const session = sessions.get(id)
        if(!session) return null
        const updated = {...session, ...changes, updatedAt: new Date().toISOString()}
        sessions.set(id,updated)
        return updated
}

function deleteSession(id){
        return sessions.delete(id)
}

function addMessage(sessionId, message){
        const session = sessions.get(sessionId)
        if(!session) return null
        session.messages.push({
                ...message,
                timestamp: new Date().toISOString()
        })
        session.updatedAt = new Date().toISOString()

        // auto-title: use first user message 

        if(session.title === 'New Chat' && message.role === 'user'){
                session.title = message.content.length >40 ? message.content.substring(0,40) + '...' : message.content
        }

        return session


}

module.exports = {createSession, getSession, getAllSessions, updateSession, deleteSession, addMessage}
