import { Tag } from "types"
import { useState, forwardRef, useImperativeHandle, useRef } from "react"
import {
  TagInput
} from 'emblor';

interface AutoCompleteTagInputProps {
  tags: Tag[]
  selectTags?: Tag[]
  shouldLimitHeight?: boolean
  onChange?: (options: {
    unbindTags: string[],
    bindTags: string[]
  }) => void
}

export interface AutoCompleteTagInputRef {
  addTags: (tag: Array<string>) => void
}

function toTagList(tags: Tag[]): { id: string, text: string }[] {
  return tags.map(tag => ({ id: tag.id.toString(), text: tag.name }))
}

const AutoCompleteTagInput = forwardRef<AutoCompleteTagInputRef, AutoCompleteTagInputProps>(({ tags, selectTags = [], onChange, shouldLimitHeight }, ref) => {
  const selectTagList = toTagList(selectTags)
  const [tagList, setTagList] = useState<Array<{ id: string, text: string }>>(selectTagList);
  const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null);
  const autoCompleteTags = toTagList(tags);

  const setTags: React.Dispatch<React.SetStateAction<Array<{ id: string, text: string }>>> = (value) => {
    setTagList(value)
    const newTagList = typeof value === 'function' ? value(tagList) : value
    onChange?.({
      unbindTags: selectTagList.filter(tag => !newTagList.find(item => tag.text === item.text)).map(tag => tag.text),
      bindTags: newTagList.map(tag => tag.text)
    })
  };

  useImperativeHandle(ref, () => ({
    addTags: (tags: Array<string>) => {
      const unselectTags = tags.filter(tag => !tagList.find(item => item.text === tag))
      const existTags = autoCompleteTags.filter(tag => unselectTags.includes(tag.text))
      const notExistTags = unselectTags
        .filter(tag => !existTags.find(item => item.text === tag))
        .map(item => ({ id: crypto.getRandomValues(new Uint32Array(1))[0].toString(), text: item }))
      setTags([...tagList, ...existTags, ...notExistTags])
    }
  }))

  return (
    <TagInput
      tags={tagList}
      activeTagIndex={activeTagIndex}
      setActiveTagIndex={setActiveTagIndex}
      setTags={setTags}
      enableAutocomplete={true}
      inlineTags={true}
      restrictTagsToAutocompleteOptions={false}
      direction="row"
      placeholder="Add a tag"
      styleClasses={{
        inlineTagsContainer: "rounded-md",
        autoComplete: {
          popoverTrigger: "w-[calc(36px-0.75rem)]",
          popoverContent: shouldLimitHeight ? "max-h-[150px] overflow-auto scrollbar-hide" : "",
          commandList: "max-h-full"
        },
        input: "px-0 shadow-none"
      }}
      addTagsOnBlur={true}
      autocompleteOptions={autoCompleteTags}
    >
    </TagInput>
  )
})

export default AutoCompleteTagInput