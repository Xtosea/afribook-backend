import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import PostCard from "../components/PostCard";
import { fetchWithToken, API_BASE } from "../api/api";
import ProfilePicUploader from "../components/ProfilePicUploader";
import CoverPicUploader from "../components/CoverPicUploader";

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [intro, setIntro] = useState("");
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("token");
  const currentUserId = localStorage.getItem("userId");
  const finalUserId = userId || currentUserId;

  const feedRef = useRef([]);
  
  // Video lazy play
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const video = entry.target;
          if (entry.isIntersecting) video.play().catch(() => {});
          else video.pause();
        });
      },
      { threshold: 0.5 }
    );

    feedRef.current.forEach(v => v && observer.observe(v));
    return () => feedRef.current.forEach(v => v && observer.unobserve(v));
  }, [posts]);

  const fixUrl = (url, fallback) => {
    if (!url) return `${API_BASE}${fallback}`;
    return url.startsWith("http") ? url : `${API_BASE}${url}`;
  };

  useEffect(() => {
    if (!token) navigate("/login");

    let isMounted = true;

    const fetchProfile = async () => {
      try {
        const [userData, postsData] = await Promise.all([
          fetchWithToken(`${API_BASE}/api/users/${finalUserId}`, token),
          fetchWithToken(`${API_BASE}/api/posts/user/${finalUserId}`, token),
        ]);

        if (!isMounted) return;

        setUser(userData);
        setBio(userData.bio || "");
        setIntro(userData.intro || "");

        const followerIds = (userData.followers || []).map(f =>
          typeof f === "object" ? f._id : f
        );
        setIsFollowing(followerIds.includes(currentUserId));

        const fixedPosts = postsData.map(post => ({
          ...post,
          media: post.media?.map(m => ({
            ...m,
            url: m.url.startsWith("http") ? m.url : `${API_BASE}${m.url}`,
            isReel: m.isReel || (m.type === "video" && post.media.length === 1),
          })),
          user: {
            ...post.user,
            profilePic: post.user?.profilePic
              ? fixUrl(post.user.profilePic, "/uploads/profiles/default-profile.png")
              : `${API_BASE}/uploads/profiles/default-profile.png`,
          },
        }));

        setPosts(fixedPosts);
      } catch (err) {
        console.error("FETCH PROFILE ERROR:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        navigate("/login");
      }
    };

    fetchProfile();

    return () => { isMounted = false };
  }, [finalUserId, token, currentUserId, navigate]);

  const handleFollow = async () => {
    try {
      await fetchWithToken(`${API_BASE}/api/users/${finalUserId}/follow`, token, { method: "PUT" });
      setIsFollowing(!isFollowing);
    } catch (err) {
      console.error("FOLLOW ERROR:", err);
    }
  };

  const handleLike = async (postId) => {
    try {
      await fetchWithToken(`${API_BASE}/api/posts/${postId}/like`, token, { method: "PUT" });
      setPosts(prev =>
        prev.map(p =>
          p._id === postId
            ? { ...p, likes: p.likes.includes(currentUserId) 
                ? p.likes.filter(id => id !== currentUserId)
                : [...(p.likes || []), currentUserId] }
            : p
        )
      );
    } catch (err) {
      console.error("LIKE ERROR:", err);
    }
  };

  const handleComment = async (postId, text) => {
    try {
      const { comment } = await fetchWithToken(
        `${API_BASE}/api/posts/${postId}/comment`,
        token,
        { method: "POST", body: JSON.stringify({ text }), headers: { "Content-Type": "application/json" } }
      );
      setPosts(prev =>
        prev.map(p =>
          p._id === postId
            ? { ...p, comments: [...(p.comments || []), comment] }
            : p
        )
      );
    } catch (err) {
      console.error("COMMENT ERROR:", err);
    }
  };

  const handleUpdateProfile = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("bio", bio);
      formData.append("intro", intro);

      const updatedUser = await fetchWithToken(`${API_BASE}/api/users/${finalUserId}`, token, {
        method: "PUT",
        body: formData,
      });

      setUser(updatedUser.user || updatedUser);
      setIsEditing(false);
    } catch (err) {
      console.error("UPDATE PROFILE ERROR:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <p className="text-center mt-10">Loading profile...</p>;

  return (
    <div className="container mx-auto py-6 space-y-6">

      {/* COVER PHOTO */}
      <div className="w-full h-48 bg-gray-200 rounded overflow-hidden relative">
        <img
          src={fixUrl(user.coverPhoto, "/uploads/profiles/default-cover.png")}
          alt="cover"
          className="w-full h-full object-cover"
        />
        {isEditing && (
          <div className="absolute top-2 left-2 bg-white p-2 rounded shadow">
            <CoverPicUploader onUploaded={(url) => setUser(prev => ({ ...prev, coverPhoto: url }))} />
          </div>
        )}
      </div>

      {/* PROFILE CARD */}
      <div className="flex items-center space-x-6 bg-white p-4 rounded shadow relative">
        <img
          src={fixUrl(user.profilePic, "/uploads/profiles/default-profile.png")}
          alt="profile"
          className="w-24 h-24 rounded-full object-cover"
        />
        {isEditing && (
          <div className="absolute -mt-12 ml-4">
            <ProfilePicUploader onUploaded={(url) => setUser(prev => ({ ...prev, profilePic: url }))} />
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            <Link to={`/profile/${finalUserId}`}>{user.name}</Link>
          </h1>

          {!isEditing ? (
            <>
              {user.intro && <p className="text-gray-600">{user.intro}</p>}
              {user.bio && <p className="text-gray-500 mt-1">{user.bio}</p>}
            </>
          ) : (
            <div className="space-y-2 mt-1">
              <input value={intro} onChange={e => setIntro(e.target.value)} placeholder="Intro" className="border rounded w-full p-1" />
              <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Bio" className="border rounded w-full p-1" />
              <button onClick={handleUpdateProfile} disabled={saving} className="px-4 py-2 bg-green-500 text-white rounded">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          )}

          <div className="flex gap-4 mt-2 text-sm">
            <span>{user.points || 0} points</span>
            <span>{user.followers?.length || 0} Followers</span>
            <span>{user.following?.length || 0} Following</span>
          </div>
        </div>

        {finalUserId === currentUserId ? (
          <button onClick={() => setIsEditing(!isEditing)} className="px-4 py-2 bg-blue-500 text-white rounded">
            {isEditing ? "Cancel" : "Edit Profile"}
          </button>
        ) : (
          <button onClick={handleFollow} className={`px-4 py-2 rounded ${isFollowing ? "bg-gray-300 text-black" : "bg-blue-500 text-white"}`}>
            {isFollowing ? "Unfollow" : "Follow"}
          </button>
        )}
      </div>

      {/* POSTS */}
      <div className="space-y-6">
        {posts.length === 0 ? (
          <p className="text-center text-gray-500">No posts yet.</p>
        ) : (
          posts.map((post, idx) => (
            <div key={post._id} className="bg-white rounded shadow overflow-hidden">
              {post.media && post.media.length > 0 ? (
                <div className="flex overflow-x-auto snap-x snap-mandatory">
                  {post.media.map((m, i) => (
                    <div key={i} className="flex-shrink-0 w-full h-64 relative snap-start">
                      {m.type === "image" ? (
                        <img src={m.url} className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <video
                            ref={el => (feedRef.current[idx * 10 + i] = el)}
                            src={m.url}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                            controls
                          />
                          {m.isReel && (
                            <span className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 text-xs rounded">Reel</span>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}

              <PostCard
                post={post}
                onLike={handleLike}
                onComment={handleComment}
                currentUserId={currentUserId}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Profile;