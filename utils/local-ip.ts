// Currently Deno does not provide a way to access local network interfaces.
// When this implementation gets finished, this module will probably be deprecated:
// https://github.com/denoland/deno/issues/3802

// This code is published as a module to use here: https://github.com/joakimunge/deno-local-ip/
import { decode } from './utils.ts'

export const getNetworkAddr = async () => {
  let ifconfig: Deno.Process | undefined
  const os = Deno.build.os
  if (os === 'windows') {
    try {
      ifconfig = await Deno.run({
        cmd: ['ipconfig'],
        stdout: 'piped',
      })
      const { success } = await ifconfig.status()
      if (!success) {
        throw new Error('Subprocess ifconfig failed to run')
      }
      const raw = await ifconfig.output()
      const text = decode(raw)
      const addrs = text.match(/ipv4.+([0-9]+\.){3}[0-9]+/gi)
      let addr = addrs ? addrs[0].match(/([0-9]+\.){3}[0-9]+/g) : undefined
      const finaladdr = addr ? addr[0] : undefined
      await Deno.close(ifconfig.rid)
      if (!addrs || !addrs.find((addr) => /([0-9]*.){3}[0-9]*$/.test(addr))) {
        throw new Error('Could not resolve your local adress.')
      }
      return finaladdr
    } catch (err) {
      ifconfig && (await Deno.close(ifconfig.rid))
      console.log(err.message)
    }
  } else {
    try {
      ifconfig = await Deno.run({
        cmd: ['ifconfig'],
        stdout: 'piped',
      })
      const { success } = await ifconfig.status()
      if (!success) {
        throw new Error('Subprocess ifconfig failed to run')
      }
      const raw = await ifconfig.output()
      const text = decode(raw)
      const addrs = text.match(
        new RegExp('inet (addr:)?([0-9]*.){3}[0-9]*', 'g')
      )
      if (!addrs || !addrs.some((x) => !x.startsWith('inet 127'))) {
        throw new Error('Could not resolve your local adress.')
      }

      await Deno.close(ifconfig.rid)
      return (
        addrs &&
        addrs
          .find((addr: string) => !addr.startsWith('inet 127'))
          ?.split('inet ')[1]
      )
    } catch (err) {
      ifconfig && (await Deno.close(ifconfig.rid))
      console.log(err.message)
    }
  }
}
