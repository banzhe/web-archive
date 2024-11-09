import { Tag } from "types"
import { useState } from "react"
import {
  TagInput
} from 'emblor';

interface AutoCompleteTagInputProps {
  tags: Tag[]
  selectTags?: Tag[]
  onChange?: (options: {
    unbindTags: string[],
    bindTags: string[]
  }) => void
}

function toTagList(tags: Tag[]): { id: string, text: string }[] {
  return tags.map(tag => ({ id: tag.id.toString(), text: tag.name }))
}

function AutoCompleteTagInput({ tags, selectTags = [], onChange }: AutoCompleteTagInputProps) {
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
        },
        input: "px-0"
      }}
      autocompleteOptions={autoCompleteTags}
    >
    </TagInput>
  )
}

export default AutoCompleteTagInput