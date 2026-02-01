import * as Y from 'yjs'

/**
 * Yjs Document Manager
 * 
 * Manages Yjs documents for each document in the application.
 * In a production app, this would sync with a server using y-websocket or y-indexeddb.
 * For now, we create local Yjs documents that provide CRDT benefits for comment positioning.
 */

// Cache of Yjs documents by document ID
const yjsDocuments = new Map<string, Y.Doc>()

/**
 * Gets or creates a Yjs document for a given document ID.
 */
export function getYjsDocument(documentId: string): Y.Doc {
  let ydoc = yjsDocuments.get(documentId)
  
  if (!ydoc) {
    ydoc = new Y.Doc()
    yjsDocuments.set(documentId, ydoc)
  }
  
  return ydoc
}

/**
 * Gets the XML fragment that TipTap uses for content.
 */
export function getYjsFragment(documentId: string): Y.XmlFragment {
  const ydoc = getYjsDocument(documentId)
  return ydoc.getXmlFragment('prosemirror')
}

/**
 * Destroys a Yjs document and removes it from the cache.
 * Call this when a document is closed.
 */
export function destroyYjsDocument(documentId: string): void {
  const ydoc = yjsDocuments.get(documentId)
  if (ydoc) {
    ydoc.destroy()
    yjsDocuments.delete(documentId)
  }
}

/**
 * Exports the current state of a Yjs document as a Uint8Array.
 * This can be stored in the database for persistence.
 */
export function exportYjsState(documentId: string): Uint8Array {
  const ydoc = getYjsDocument(documentId)
  return Y.encodeStateAsUpdate(ydoc)
}

/**
 * Imports a previously exported state into a Yjs document.
 */
export function importYjsState(documentId: string, state: Uint8Array): void {
  const ydoc = getYjsDocument(documentId)
  Y.applyUpdate(ydoc, state)
}

/**
 * Gets the state vector for a document (used for syncing).
 */
export function getYjsStateVector(documentId: string): Uint8Array {
  const ydoc = getYjsDocument(documentId)
  return Y.encodeStateVector(ydoc)
}

/**
 * Computes the diff between local state and remote state vector.
 */
export function computeYjsDiff(documentId: string, remoteStateVector: Uint8Array): Uint8Array {
  const ydoc = getYjsDocument(documentId)
  return Y.encodeStateAsUpdate(ydoc, remoteStateVector)
}