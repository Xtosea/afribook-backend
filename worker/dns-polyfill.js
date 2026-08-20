async function dnsQuery(hostName, type) {
  const response = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostName)}&type=${type}`,
    {
      headers: {
        Accept: "application/dns-json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `DNS query failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

export async function resolve(hostName, rrtype = "A") {
  const data = await dnsQuery(hostName, rrtype);

  if (!data.Answer) {
    return [];
  }

  if (rrtype === "SRV") {
    return data.Answer.map(({ data }) => {
      const [priority, weight, port, name] = data.split(" ");

      return {
        name: name.endsWith(".")
          ? name.slice(0, -1)
          : name,
        port: Number(port),
        priority: Number(priority),
        weight: Number(weight),
      };
    });
  }

  if (rrtype === "TXT") {
    return data.Answer.map(({ data }) =>
      [data.replace(/("|\\)/gm, "")]
    );
  }

  return data.Answer.map(({ data }) => data);
}

export async function resolveSrv(hostName) {
  return resolve(hostName, "SRV");
}

export async function resolveTxt(hostName) {
  return resolve(hostName, "TXT");
}

export const promises = {
  resolve,
  resolveSrv,
  resolveTxt,
};

export default {
  resolve,
  resolveSrv,
  resolveTxt,
  promises,
};
