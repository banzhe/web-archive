import i18n from 'i18next'
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { useState } from 'react';
import { Button } from './button';
import { Check, ChevronDown } from 'lucide-react';
import { Command, CommandGroup, CommandItem, CommandList } from './command';

function LanguageCombobox() {
  const [open, setOpen] = useState(false)
  const supportedLanguages = [
    {
      value: 'en',
      label: 'English'
    },
    {
      value: 'zh-CN',
      label: '简体中文'
    }
  ]
  console.log(i18n.language)
  const [language, setLanguage] = useState(i18n.language)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between w-40"
        >
          {supportedLanguages.find(option => option.value === language)?.label}
          {open ? <ChevronDown size={16} className="transform rotate-180 opacity-50" /> : <ChevronDown size={16} className="opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-40">
        <Command>
          <CommandList>
            <CommandGroup>
              {supportedLanguages.map(option => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    setLanguage(currentValue)
                    setOpen(false)
                    i18n.changeLanguage(currentValue)
                  }}
                >
                  <Check
                    className={language === option.value ? 'opacity-100' : 'opacity-0'}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default LanguageCombobox;