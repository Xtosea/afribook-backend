import { ObjectId } from "mongodb";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

/* ================= TOP USERS LEADERBOARD ================= */

export async function getLeaderboardTop(request, env, db) {
  try {
    const topUsers = await db.collection("wallets")
      .aggregate([
        {
          $sort: {
            points: -1,
          },
        },
        {
          $limit: 20,
        },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userData",
          },
        },
        {
          $unwind: {
            path: "$userData",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 0,
            userId: "$userData._id",
            name: "$userData.name",
            profilePic: "$userData.profilePic",
            intro: "$userData.intro",
            points: {
              $ifNull: ["$points", 0],
            },
            balance: {
              $ifNull: ["$balance", 0],
            },
          },
        },
      ])
      .toArray();

    const formatted = topUsers.map((wallet, index) => ({
      rank: index + 1,
      userId: wallet.userId,
      name: wallet.name,
      profilePic: wallet.profilePic,
      intro: wallet.intro,
      points: wallet.points,
      balance: wallet.balance,
    }));

    return json(formatted);

  } catch (error) {
    console.error("LEADERBOARD ERROR:", error);

    return json({
      error: "Server error",
    }, 500);
  }
}
