import { AppTitle } from '@/app/components/header/app-title'
import { LoginForm } from '@/app/components/login/form'
import { WindowControlButtons } from '@/app/components/window-control-buttons'
import { isWindows, isLinux } from '@/utils/desktop'

export default function Login() {
  return (
    <div className="flex flex-col w-screen h-screen relative">
      <header className="w-full flex items-center justify-between h-header px-4 fixed top-0 right-0 left-0 z-20 bg-background border-b electron-drag">
        <div className="w-[100px]" />
        <AppTitle />
        <div className="flex items-center w-[100px] justify-end">
          {isWindows && (
            <WindowControlButtons
              className="ml-1"
              buttonClassName="h-7 w-7 rounded-[8px] border-transparent bg-transparent text-foreground/90 hover:bg-accent/65"
              closeButtonClassName="hover:bg-red-600/75 hover:border-red-500/40 hover:text-white"
            />
          )}
          {isLinux && <div className="w-[94px]" />}
        </div>
      </header>
      <main className="flex flex-col w-full h-full justify-center items-center">
        <LoginForm />
      </main>
    </div>
  )
}
