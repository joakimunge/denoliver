// Currently Deno does not provide a way to access local network interfaces.
// When this implementation gets finished, this module will probably be deprecated:
// https://github.com/denoland/deno/issues/3802

// This code is published as a module to use here: https://github.com/joakimunge/deno-local-ip/
import { decode, error } from './utils.ts'

export const getNetworkAddr = async () => {
  const isWin = Deno.build.os === 'windows'
  const command = isWin ? 'ipconfig' : 'ifconfig'
  try {
    // initialize command
    let ifconfig = await Deno.run({
      cmd: [command],
      stdout: 'piped',
    })

    // handle errors
    const { success } = await ifconfig.status()
    if (!success) {
      throw new Error(`Subprocess ${command} failed to run`)
    }

    // get output
    const raw = await ifconfig.output()
    const text = decode(raw)

    // get ip
    if (isWin) {
      const addrs = text.match(new RegExp('ipv4.+([0-9]+.){3}[0-9]+', 'gi'))
      let temp = addrs
        ? addrs[0].match(new RegExp('([0-9]+.){3}[0-9]+', 'g'))
        : undefined
      const addr = temp ? temp[0] : undefined
      await Deno.close(ifconfig.rid)
      if (!addr) {
        throw new Error('Could not resolve your local adress.')
      }
      return addr
    } else {
      const addrs = text.match(
        new RegExp('inet (addr:)?([0-9]*.){3}[0-9]*', 'g')
      )
      await Deno.close(ifconfig.rid)
      if (!addrs || !addrs.some((x) => !x.startsWith('inet 127'))) {
        throw new Error('Could not resolve your local adress.')
      }
      return (
        addrs &&
        addrs
          .find((addr: string) => !addr.startsWith('inet 127'))
          ?.split('inet ')[1]
      )
    }
  } catch (err) {
    console.log(error(err.message))
  }
}
