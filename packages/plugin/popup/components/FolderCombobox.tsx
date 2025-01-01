import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'

import { cn } from '@web-archive/shared/utils'
import { Button } from '@web-archive/shared/components/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@web-archive/shared/components/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@web-archive/shared/components/popover'
import { useTranslation } from 'react-i18next'

interface ComboboxProps {
  value?: string
  onValueChange?: (value: string) => void
  options: { value: string, label: string }[]
}

function FolderCombobox({ value, onValueChange, options }: ComboboxProps) {
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between w-full"
        >
          {value
            ? options.find(option => option.value === value)?.label
            : t('select-folder-placeholder')}
          {open ? <ChevronDown size={16} className="transform rotate-180 opacity-50" /> : <ChevronDown size={16} className="opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[14.5rem]">
        <Command>
          <CommandList className="h-48 scrollbar-hide">
            <CommandEmpty>{t('no-folder-found')}</CommandEmpty>
            <CommandGroup>
              {options.map(option => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onValueChange?.(currentValue === value ? '' : currentValue)
                    setOpen(false)
                  }}
                >
                  {option.label}
                  <Check
                    className={cn(
                      'ml-auto',
                      value === option.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default FolderCombobox
