import { useEffect, useState } from 'react'

/**
 * React Hook that receives an instance of `File`, `Blob` or `MediaSource` and
 * creates an URL representing it, providing a state object containing the file
 * with a set function to change the file object. It releases URL when component
 * unmount or parameter changes.
 * @param initialObject - `null` or an instance of `File`, `Blob` or `MediaSource`.
 * @source https://github.com/VitorLuizC/use-object-url/blob/master/src/index.ts
 */
function useObjectURL(initialObject: null | File | Blob | MediaSource | string | undefined) {
  const [objectURL, setObjectURL] = useState<null | string>(null)

  const [object, setObject] = useState<null | File | Blob | MediaSource | string | undefined>(
    initialObject,
  )

  useEffect(() => {
    if (!object) {
      return
    }

    const targetObject = (typeof object === 'string' ? new Blob([object], { type: 'text/html' }) : object)

    const objectURL = URL.createObjectURL(targetObject)
    setObjectURL(objectURL)
    return () => {
      URL.revokeObjectURL(objectURL)
      setObjectURL(null)
    }
  }, [object])

  return {
    objectURL,
    object,
    setObject,
  }
}

export { useObjectURL }
