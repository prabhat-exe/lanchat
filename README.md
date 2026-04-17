# LAN Chat

A browser chat room for people connected to the same router or Wi-Fi network.

## Run

Install dependencies once:

```bash
npm install
```

Start the server:

```bash
npm start
```

Open this on the host machine:

```text
http://localhost:3000
```

Other devices on the same LAN can open the host machine's LAN address printed by the server, for example:

```text
http://192.168.1.5:3000
```

If another device opens `http://localhost:3000`, it will try to connect to itself instead of the host. Other people must use the host's IP address above.

On the client page there is also a LAN host address box where you can enter the host server URL manually.

## If Other Devices Cannot Connect

Allow the port through the firewall:

```bash
sudo ufw allow 3000
```

Make sure every device is connected to the same router or Wi-Fi network.

## Change Port

```bash
PORT=4000 npm start
```
