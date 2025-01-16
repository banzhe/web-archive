import { ArrowLeft, CircleHelp } from 'lucide-react'
import { useState } from 'react'
import { Checkbox } from '@web-archive/shared/components/checkbox'
import { Label } from '@web-archive/shared/components/label'
import { Input } from '@web-archive/shared/components/input'
import { useTranslation } from 'react-i18next'
import LanguageCombobox from '@web-archive/shared/components/language-combobox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@web-archive/shared/components/tooltip'
import { TooltipPortal } from '@radix-ui/react-tooltip'
import { getSingleFileSetting, setSingleFileSetting } from '../utils/singleFile'
import type { PageType } from '~/popup/PopupPage'
import type { SingleFileSetting } from '~/utils/singleFile'

function SettingPage({ setActivePage }: { setActivePage: (tab: PageType) => void }) {
  const { t } = useTranslation()
  return (
    <div className="w-80 space-y-2 p-4">
      <div className="h-6 mb-2 items-center flex space-x-3">
        <ArrowLeft
          className="cursor-pointer"
          size={16}
          onClick={() => { setActivePage('home') }}
        >
        </ArrowLeft>
      </div>
      <div className="space-x-3">
        <span className="text-lg font-semibold mb-3 ">
          {t('language')}
        </span>
        <LanguageCombobox></LanguageCombobox>
      </div>
      <div>
        <SingleFileSettings></SingleFileSettings>
      </div>
    </div>
  )
}

function SingleFileSettings() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<SingleFileSetting>(getSingleFileSetting())

  function handleChange(checked: boolean | string, key: keyof SingleFileSetting) {
    if (typeof checked === 'string') {
      return
    }
    setSettings((prev) => {
      const newSettings = {
        ...prev,
        [key]: checked,
      }
      setSingleFileSetting(newSettings)
      return newSettings
    })
  }

  return (
    <div className="w-full">
      <div className="text-lg font-semibold mb-3">{t('singlefile-settings')}</div>
      <div className="flex flex-col space-y-3">
        <SettingCheckBox
          id="removeHiddenElements"
          checked={settings.removeHiddenElements}
          onCheckedChange={checked => handleChange(checked, 'removeHiddenElements')}
          label={t('remove-hidden-elements')}
        >
        </SettingCheckBox>
        <SettingCheckBox
          id="removeUnusedStyles"
          checked={settings.removeUnusedStyles}
          onCheckedChange={checked => handleChange(checked, 'removeUnusedStyles')}
          label={t('remove-unused-styles')}
        >
        </SettingCheckBox>
        <SettingCheckBox
          id="removeUnusedFonts"
          checked={settings.removeUnusedFonts}
          onCheckedChange={checked => handleChange(checked, 'removeUnusedFonts')}
          label={t('remove-unused-fonts')}
        >
        </SettingCheckBox>
        <SettingCheckBox
          id="removeImports"
          checked={settings.removeImports}
          onCheckedChange={checked => handleChange(checked, 'removeImports')}
          label={t('remove-imports')}
        >
        </SettingCheckBox>
        <SettingCheckBox
          id="blockScripts"
          checked={settings.blockScripts}
          onCheckedChange={checked => handleChange(checked, 'blockScripts')}
          label={t('block-scripts')}
        >
        </SettingCheckBox>
        <SettingCheckBox
          id="blockAudios"
          checked={settings.blockAudios}
          onCheckedChange={checked => handleChange(checked, 'blockAudios')}
          label={t('block-audios')}
        >
        </SettingCheckBox>
        <SettingCheckBox
          id="blockVideos"
          checked={settings.blockVideos}
          onCheckedChange={checked => handleChange(checked, 'blockVideos')}
          label={t('block-videos')}
        >
        </SettingCheckBox>
        <SettingCheckBox
          id="compressHTML"
          checked={settings.compressHTML}
          onCheckedChange={checked => handleChange(checked, 'compressHTML')}
          label={t('compress-HTML')}
        >
        </SettingCheckBox>
        <SettingCheckBox
          id="removeAlternativeFonts"
          checked={settings.removeAlternativeFonts}
          onCheckedChange={checked => handleChange(checked, 'removeAlternativeFonts')}
          label={t('remove-alternative-fonts')}
        >
        </SettingCheckBox>
        <SettingCheckBox
          id="removeAlternativeMedias"
          checked={settings.removeAlternativeMedias}
          onCheckedChange={checked => handleChange(checked, 'removeAlternativeMedias')}
          label={t('remove-alternative-medias')}
        >
        </SettingCheckBox>
        <SettingCheckBox
          id="removeAlternativeImages"
          checked={settings.removeAlternativeImages}
          onCheckedChange={checked => handleChange(checked, 'removeAlternativeImages')}
          label={t('remove-alternative-images')}
        >
        </SettingCheckBox>
        <SettingCheckBox
          id="groupDuplicateImages"
          checked={settings.groupDuplicateImages}
          onCheckedChange={checked => handleChange(checked, 'groupDuplicateImages')}
          label={t('group-duplicate-images')}
        >
        </SettingCheckBox>
        <SettingCheckBox
          id="loadDeferredImages"
          checked={settings.loadDeferredImages ?? true}
          onCheckedChange={checked => handleChange(checked, 'loadDeferredImages')}
          label={t('load-deferred-images')}
        >
        </SettingCheckBox>
        <div className="space-y-2">
          <Label>{t('load-deferred-images-max-idle-time')}</Label>
          <Input
            type="number"
            value={settings.loadDeferredImagesMaxIdleTime ?? 1500}
            onChange={(e) => {
              const value = e.target.value
              setSettings((prev) => {
                const newSettings = {
                  ...prev,
                  loadDeferredImagesMaxIdleTime: Number.parseInt(value),
                }
                setSingleFileSetting(newSettings)
                return newSettings
              })
            }}
          />
        </div>
        <SettingCheckBox
          id="groupDuplicateStylesheets"
          checked={settings.groupDuplicateStylesheets ?? false}
          onCheckedChange={checked => handleChange(checked, 'groupDuplicateStylesheets')}
          label="Group Duplicate Stylesheets"
          helpText="Enable this option to group duplicate stylesheets. It will reduce the size of the output file. If you want to save the website on Reddit, you should enable this option."
        >
        </SettingCheckBox>
      </div>
    </div>
  )
}

interface SettingCheckBoxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  id: string
  helpText?: string
}

function SettingCheckBox({ checked, onCheckedChange, label, id, helpText }: SettingCheckBoxProps) {
  function handleChange(checked: boolean | string) {
    if (typeof checked === 'string') {
      return
    }
    onCheckedChange(checked)
  }

  return (
    <div className="flex items-center space-x-2 w-full">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={handleChange}
      >
      </Checkbox>
      <Label
        htmlFor={id}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
      </Label>
      {helpText
        && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <CircleHelp size={14}></CircleHelp>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent className="max-w-64">
                  {helpText}
                </TooltipContent>
              </TooltipPortal>
            </Tooltip>
          </TooltipProvider>
        )}
    </div>
  )
}

export default SettingPage
