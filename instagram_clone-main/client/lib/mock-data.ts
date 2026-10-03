export interface User {
    _id: string;
    fullName: string;
    username: string;
    email: string;
    bio: string;
    profilePic: string;
    website: string;
    followers: string[];
    following: string[];
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Comment {
    _id: string;
    user: User;
    text: string;
    createdAt: string;
}

export interface Post {
    _id: string;
    user: User;
    imageUrl: string;
    caption: string;
    location?: string;
    likes: string[];
    comments: Comment[];
    createdAt: string;
}

export const currentUser: User = {
    _id: "current_user",
    fullName: "Alex Johnson",
    username: "alexjohnson",
    email: "alex@example.com",
    bio: "Photographer & traveler. Capturing moments one frame at a time.",
    profilePic:
        "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150",
    website: "alexjohnson.com",
    followers: ["u1", "u2", "u3", "u4", "u5", "u6"],
    following: ["u1", "u2", "u3"],
    isVerified: false,
    createdAt: "2022-06-15T10:00:00Z",
    updatedAt: "2024-11-20T10:00:00Z",
};

export const mockUsers: User[] = [
    {
        _id: "u1",
        fullName: "Sophia Williams",
        username: "sophiaw",
        email: "sophia@example.com",
        bio: "Lifestyle blogger | NYC based | she/her",
        profilePic:
            "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150",
        website: "sophiaw.blog",
        followers: ["current_user", "u2", "u3", "u4"],
        following: ["current_user", "u3"],
        isVerified: true,
        createdAt: "2021-03-10T10:00:00Z",
        updatedAt: "2024-11-19T10:00:00Z",
    },
    {
        _id: "u2",
        fullName: "Marcus Chen",
        username: "marcuschen",
        email: "marcus@example.com",
        bio: "Street photographer | Tokyo & LA",
        profilePic:
            "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=150",
        website: "",
        followers: ["u1", "u3"],
        following: ["u1", "current_user"],
        isVerified: false,
        createdAt: "2020-09-22T10:00:00Z",
        updatedAt: "2024-11-18T10:00:00Z",
    },
    {
        _id: "u3",
        fullName: "Isabelle Fontaine",
        username: "isabellef",
        email: "isabelle@example.com",
        bio: "Chef & food stylist | Paris | 🍷",
        profilePic:
            "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150",
        website: "isabellecooks.fr",
        followers: ["current_user", "u1", "u2"],
        following: ["u1"],
        isVerified: true,
        createdAt: "2019-11-05T10:00:00Z",
        updatedAt: "2024-11-20T10:00:00Z",
    },
    {
        _id: "u4",
        fullName: "Jordan Rivera",
        username: "jordanriv",
        email: "jordan@example.com",
        bio: "Fitness coach | Mental health advocate",
        profilePic:
            "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150",
        website: "",
        followers: ["u1", "u2", "u5"],
        following: ["current_user", "u3"],
        isVerified: false,
        createdAt: "2023-02-14T10:00:00Z",
        updatedAt: "2024-11-17T10:00:00Z",
    },
    {
        _id: "u5",
        fullName: "Priya Sharma",
        username: "priyasharma",
        email: "priya@example.com",
        bio: "Travel addict | 47 countries and counting ✈️",
        profilePic:
            "https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=150",
        website: "priyatravels.com",
        followers: ["u1", "u4"],
        following: ["u1", "u2", "u3"],
        isVerified: false,
        createdAt: "2022-08-30T10:00:00Z",
        updatedAt: "2024-11-16T10:00:00Z",
    },
    {
        _id: "u6",
        fullName: "Noah Bennett",
        username: "noahbennett",
        email: "noah@example.com",
        bio: "Architect | Design lover | Portland, OR",
        profilePic:
            "https://images.pexels.com/photos/775358/pexels-photo-775358.jpeg?auto=compress&cs=tinysrgb&w=150",
        website: "",
        followers: ["u2", "u3"],
        following: ["u4", "u5"],
        isVerified: false,
        createdAt: "2021-07-19T10:00:00Z",
        updatedAt: "2024-11-15T10:00:00Z",
    },
    {
        _id: "u7",
        fullName: "Elena Vasquez",
        username: "elenavasquez",
        email: "elena@example.com",
        bio: "Artist & illustrator | Open commissions",
        profilePic:
            "https://images.pexels.com/photos/1382731/pexels-photo-1382731.jpeg?auto=compress&cs=tinysrgb&w=150",
        website: "elenaart.com",
        followers: ["u1", "u2", "u5", "u6"],
        following: ["u1", "u3"],
        isVerified: true,
        createdAt: "2020-04-01T10:00:00Z",
        updatedAt: "2024-11-20T10:00:00Z",
    },
    {
        _id: "u8",
        fullName: "Kai Nakamura",
        username: "kainakamura",
        email: "kai@example.com",
        bio: "Surfer & ocean conservationist | Hawaii",
        profilePic:
            "https://images.pexels.com/photos/1212984/pexels-photo-1212984.jpeg?auto=compress&cs=tinysrgb&w=150",
        website: "",
        followers: ["u4", "u5"],
        following: ["u6", "u7"],
        isVerified: false,
        createdAt: "2023-05-25T10:00:00Z",
        updatedAt: "2024-11-14T10:00:00Z",
    },
];

export const allUsers = [currentUser, ...mockUsers];

export function getUserByUsername(username: string): User | undefined {
    return allUsers.find((u) => u.username === username);
}

export const currentUserPosts: Post[] = [
    {
        _id: "cp1",
        user: currentUser,
        imageUrl:
            "https://images.pexels.com/photos/1323550/pexels-photo-1323550.jpeg?auto=compress&cs=tinysrgb&w=600",
        caption:
            "Nothing beats a sunrise at the beach. First light, zero crowds, pure peace. 🌊 #BeachLife #Sunrise #Travel",
        location: "Malibu, California",
        likes: ["u1", "u2", "u3", "u5"],
        comments: [
            {
                _id: "cc1",
                user: mockUsers[0],
                text: "This is paradise! 😍",
                createdAt: "2024-11-20T07:30:00Z",
            },
        ],
        createdAt: "2024-11-20T06:00:00Z",
    },
    {
        _id: "cp2",
        user: currentUser,
        imageUrl:
            "https://images.pexels.com/photos/1955134/pexels-photo-1955134.jpeg?auto=compress&cs=tinysrgb&w=600",
        caption:
            "Morning ritual. There's something meditative about the process of making a good cup of coffee. ☕",
        location: "Home",
        likes: ["u1", "u3", "u4"],
        comments: [],
        createdAt: "2024-11-17T08:00:00Z",
    },
    {
        _id: "cp3",
        user: currentUser,
        imageUrl:
            "https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg?auto=compress&cs=tinysrgb&w=600",
        caption:
            "Architecture is frozen music. Every building tells a story. 🏛️ #Architecture #UrbanPhotography",
        location: "Chicago, Illinois",
        likes: ["u2", "u5", "u6", "u7"],
        comments: [
            {
                _id: "cc3",
                user: mockUsers[5],
                text: "As an architect this speaks to me deeply!",
                createdAt: "2024-11-14T15:00:00Z",
            },
        ],
        createdAt: "2024-11-14T13:00:00Z",
    },
    {
        _id: "cp4",
        user: currentUser,
        imageUrl:
            "https://images.pexels.com/photos/1563356/pexels-photo-1563356.jpeg?auto=compress&cs=tinysrgb&w=600",
        caption:
            "Above the clouds, everything feels clearer. 3,200m elevation and worth every step. #Hiking #Mountains #Adventure",
        location: "Swiss Alps",
        likes: ["u1", "u2", "u3", "u4", "u5", "u6"],
        comments: [
            {
                _id: "cc4",
                user: mockUsers[4],
                text: "Switzerland is on my list! How was the hike?",
                createdAt: "2024-11-10T11:00:00Z",
            },
        ],
        createdAt: "2024-11-10T09:00:00Z",
    },
    {
        _id: "cp5",
        user: currentUser,
        imageUrl:
            "https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg?auto=compress&cs=tinysrgb&w=600",
        caption:
            "Cities never sleep and neither does my camera. Long exposure magic. 🌃 #NightPhotography #LongExposure",
        location: "New York City",
        likes: ["u1", "u7"],
        comments: [],
        createdAt: "2024-11-07T22:00:00Z",
    },
    {
        _id: "cp6",
        user: currentUser,
        imageUrl:
            "https://images.pexels.com/photos/1179156/pexels-photo-1179156.jpeg?auto=compress&cs=tinysrgb&w=600",
        caption:
            "Golden fields as far as the eye can see. Harvest season has its own kind of beauty. 🌾",
        location: "Tuscany, Italy",
        likes: ["u2", "u3", "u5"],
        comments: [
            {
                _id: "cc6",
                user: mockUsers[2],
                text: "Tuscany is something else! Been there twice and never enough 🇮🇹",
                createdAt: "2024-11-04T16:00:00Z",
            },
        ],
        createdAt: "2024-11-03T14:00:00Z",
    },
    {
        _id: "cp7",
        user: currentUser,
        imageUrl:
            "https://images.pexels.com/photos/2104152/pexels-photo-2104152.jpeg?auto=compress&cs=tinysrgb&w=600",
        caption:
            "Forest bathing. Japanese concept of Shinrin-yoku — healing through nature. Highly recommend. 🌲",
        location: "Olympic National Park, WA",
        likes: ["u1", "u4", "u6"],
        comments: [],
        createdAt: "2024-10-28T10:00:00Z",
    },
    {
        _id: "cp8",
        user: currentUser,
        imageUrl:
            "https://images.pexels.com/photos/1835718/pexels-photo-1835718.jpeg?auto=compress&cs=tinysrgb&w=600",
        caption:
            "Desert sunsets hit different. The silence out here is deafening in the best way. 🏜️ #Desert #Southwest",
        location: "Monument Valley, Arizona",
        likes: ["u2", "u3", "u5", "u7"],
        comments: [
            {
                _id: "cc8",
                user: mockUsers[1],
                text: "Shot this place last year! That red glow is unreal 🔴",
                createdAt: "2024-10-24T19:00:00Z",
            },
        ],
        createdAt: "2024-10-24T17:00:00Z",
    },
    {
        _id: "cp9",
        user: currentUser,
        imageUrl:
            "https://images.pexels.com/photos/2869565/pexels-photo-2869565.jpeg?auto=compress&cs=tinysrgb&w=600",
        caption:
            "Cold brew and a good book. Some weekends were made for this. 📖☕",
        location: "Portland, Oregon",
        likes: ["u1", "u3"],
        comments: [],
        createdAt: "2024-10-19T11:00:00Z",
    },
];

export const mockPosts: Post[] = [
    {
        _id: "p1",
        user: mockUsers[0],
        imageUrl:
            "https://images.pexels.com/photos/3225517/pexels-photo-3225517.jpeg?auto=compress&cs=tinysrgb&w=600",
        caption:
            "Golden hour never disappoints. There's something magical about that warm light just before sunset — it makes everything look like a painting. 🌅 #GoldenHour #NaturePhotography #Landscape",
        location: "Rocky Mountain National Park",
        likes: ["current_user", "u2", "u3", "u4", "u5"],
        comments: [
            {
                _id: "c1",
                user: mockUsers[1],
                text: "Absolutely breathtaking! What camera settings did you use? 📸",
                createdAt: "2024-11-19T14:00:00Z",
            },
            {
                _id: "c2",
                user: mockUsers[3],
                text: "This is wallpaper-worthy! 😍",
                createdAt: "2024-11-19T15:30:00Z",
            },
            {
                _id: "c3",
                user: currentUser,
                text: "Nature is the best artist no doubt!",
                createdAt: "2024-11-19T16:00:00Z",
            },
        ],
        createdAt: "2024-11-19T12:00:00Z",
    },
    {
        _id: "p2",
        user: mockUsers[2],
        imageUrl:
            "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600",
        caption:
            "Spent the afternoon creating this seasonal grain bowl. Roasted beets, charred corn, avocado, and a miso-tahini dressing that will change your life. Recipe link in bio! 🥗 #FoodPhotography #HealthyEating #MealPrep",
        location: "Home Kitchen, Paris",
        likes: ["u1", "u2", "u5", "u6", "u7"],
        comments: [
            {
                _id: "c4",
                user: mockUsers[0],
                text: "This looks so good! I need this recipe ASAP 😋",
                createdAt: "2024-11-19T11:00:00Z",
            },
            {
                _id: "c5",
                user: mockUsers[4],
                text: "The colors are incredible! You have such a talent for food styling 🌈",
                createdAt: "2024-11-19T11:45:00Z",
            },
        ],
        createdAt: "2024-11-19T09:30:00Z",
    },
    {
        _id: "p3",
        user: mockUsers[1],
        imageUrl:
            "https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=600",
        caption:
            "Tokyo at midnight. The city never truly sleeps — it just transforms into something even more beautiful. #Tokyo #StreetPhotography #NightPhotography #CityLights",
        location: "Shinjuku, Tokyo",
        likes: ["current_user", "u1", "u3", "u6"],
        comments: [
            {
                _id: "c6",
                user: mockUsers[6],
                text: "That neon reflection is perfect! 🔴",
                createdAt: "2024-11-18T23:30:00Z",
            },
        ],
        createdAt: "2024-11-18T22:00:00Z",
    },
    {
        _id: "p4",
        user: mockUsers[4],
        imageUrl:
            "https://images.pexels.com/photos/1581554/pexels-photo-1581554.jpeg?auto=compress&cs=tinysrgb&w=600",
        caption:
            "Sometimes you just need to get lost in a new place. Discovered this hidden gem completely by chance — no map, no plan. Just wandering. ✈️ #Travel #Wanderlust #Adventure #Explore",
        location: "Amalfi Coast, Italy",
        likes: ["u1", "u2", "u3", "u4", "u7", "u8"],
        comments: [
            {
                _id: "c7",
                user: mockUsers[0],
                text: "This is on my bucket list! How long did you stay?",
                createdAt: "2024-11-18T16:00:00Z",
            },
            {
                _id: "c8",
                user: mockUsers[2],
                text: "Those colors! Italy is on another level 🇮🇹",
                createdAt: "2024-11-18T17:20:00Z",
            },
        ],
        createdAt: "2024-11-18T14:00:00Z",
    },
    {
        _id: "p5",
        user: mockUsers[3],
        imageUrl:
            "https://images.pexels.com/photos/2827392/pexels-photo-2827392.jpeg?auto=compress&cs=tinysrgb&w=600",
        caption:
            "Morning run done ✅ 6am, 10k, foggy trails — this is what peak mental clarity feels like. Your body is capable of more than you think. Start before you're ready. 💪 #FitLife #Running #MorningRun #MentalHealth",
        location: "Griffith Park, Los Angeles",
        likes: ["u1", "u5", "u6"],
        comments: [
            {
                _id: "c9",
                user: mockUsers[7],
                text: "You're inspiring me to wake up earlier! 🏃",
                createdAt: "2024-11-18T09:00:00Z",
            },
        ],
        createdAt: "2024-11-18T06:30:00Z",
    },
    {
        _id: "p6",
        user: mockUsers[6],
        imageUrl:
            "https://images.pexels.com/photos/1183992/pexels-photo-1183992.jpeg?auto=compress&cs=tinysrgb&w=600",
        caption:
            "New piece finished! This one took 3 weeks and about 400 individual brush strokes. It's called 'In Between Worlds'. Available as a limited print — link in bio. 🎨 #Art #Illustration #DigitalArt #ContemporaryArt",
        location: "Studio, Barcelona",
        likes: ["u1", "u2", "u3", "u5", "current_user"],
        comments: [
            {
                _id: "c10",
                user: mockUsers[0],
                text: "This is stunning! The color palette is *chef's kiss* 🤌",
                createdAt: "2024-11-17T20:00:00Z",
            },
            {
                _id: "c11",
                user: currentUser,
                text: "Already ordered a print! Can't wait to hang this.",
                createdAt: "2024-11-17T21:00:00Z",
            },
            {
                _id: "c12",
                user: mockUsers[4],
                text: "You're so talented! This gives me chills 🥺",
                createdAt: "2024-11-17T22:30:00Z",
            },
        ],
        createdAt: "2024-11-17T18:00:00Z",
    },
];

export const storyUsers: User[] = [
    mockUsers[0],
    mockUsers[2],
    mockUsers[1],
    mockUsers[4],
    mockUsers[3],
    mockUsers[6],
    mockUsers[7],
    mockUsers[5],
];

export const suggestedUsers: User[] = [
    mockUsers[5],
    mockUsers[7],
    mockUsers[3],
    mockUsers[4],
    mockUsers[6],
];

export function formatTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffSec < 60) return `${diffSec}s`;
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHr < 24) return `${diffHr}h`;
    if (diffDays < 7) return `${diffDays}d`;
    if (diffWeeks < 4) return `${diffWeeks}w`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatLikeCount(count: number): string {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count?.toString();
}

const allPostsById: Record<string, Post[]> = {
    current_user: currentUserPosts,
    u1: mockPosts.filter((p) => p.user._id === "u1"),
    u2: mockPosts.filter((p) => p.user._id === "u2"),
    u3: mockPosts.filter((p) => p.user._id === "u3"),
    u4: mockPosts.filter((p) => p.user._id === "u4"),
    u5: mockPosts.filter((p) => p.user._id === "u5"),
    u6: mockPosts.filter((p) => p.user._id === "u6"),
    u7: mockPosts.filter((p) => p.user._id === "u7"),
};

export function getPostsByUserId(userId: string): Post[] {
    return allPostsById[userId] ?? [];
}

// ─── Stories ────────────────────────────────────────────────────────────────

export interface Story {
    _id: string;
    user: User;
    imageUrl: string;
}

export interface StoryGroup {
    user: User;
    stories: Story[];
}

// Order intentionally matches storyUsers array
export const mockStoryGroups: StoryGroup[] = [
    {
        user: mockUsers[0],
        stories: [{ _id: "sg0", user: mockUsers[0], imageUrl: "https://images.pexels.com/photos/3225517/pexels-photo-3225517.jpeg?auto=compress&cs=tinysrgb&w=600&h=1000&fit=crop" }],
    },
    {
        user: mockUsers[2],
        stories: [{ _id: "sg1", user: mockUsers[2], imageUrl: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600&h=1000&fit=crop" }],
    },
    {
        user: mockUsers[1],
        stories: [{ _id: "sg2", user: mockUsers[1], imageUrl: "https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=600&h=1000&fit=crop" }],
    },
    {
        user: mockUsers[4],
        stories: [{ _id: "sg3", user: mockUsers[4], imageUrl: "https://images.pexels.com/photos/1581554/pexels-photo-1581554.jpeg?auto=compress&cs=tinysrgb&w=600&h=1000&fit=crop" }],
    },
    {
        user: mockUsers[3],
        stories: [{ _id: "sg4", user: mockUsers[3], imageUrl: "https://images.pexels.com/photos/2827392/pexels-photo-2827392.jpeg?auto=compress&cs=tinysrgb&w=600&h=1000&fit=crop" }],
    },
    {
        user: mockUsers[6],
        stories: [{ _id: "sg5", user: mockUsers[6], imageUrl: "https://images.pexels.com/photos/1183992/pexels-photo-1183992.jpeg?auto=compress&cs=tinysrgb&w=600&h=1000&fit=crop" }],
    },
    {
        user: mockUsers[7],
        stories: [{ _id: "sg6", user: mockUsers[7], imageUrl: "https://images.pexels.com/photos/1323550/pexels-photo-1323550.jpeg?auto=compress&cs=tinysrgb&w=600&h=1000&fit=crop" }],
    },
    {
        user: mockUsers[5],
        stories: [{ _id: "sg7", user: mockUsers[5], imageUrl: "https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg?auto=compress&cs=tinysrgb&w=600&h=1000&fit=crop" }],
    },
];

// ─── Reels ───────────────────────────────────────────────────────────────────

export interface Reel {
    _id: string;
    user: User;
    imageUrl: string;
    caption: string;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    audio: string;
}

export const mockReels: Reel[] = [
    {
        _id: "r1",
        user: mockUsers[0],
        imageUrl: "https://images.pexels.com/photos/3225517/pexels-photo-3225517.jpeg?auto=compress&cs=tinysrgb&w=400&h=720&fit=crop",
        caption: "Golden hour in the mountains hits different every single time ✨ #GoldenHour #Mountains #Explore",
        likes: 24500, comments: 342, shares: 1200, saves: 890,
        audio: "Original audio · sophiaw",
    },
    {
        _id: "r2",
        user: mockUsers[2],
        imageUrl: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400&h=720&fit=crop",
        caption: "Making this grain bowl changed my entire meal prep game 🥗 Recipe link in bio! #FoodTok #HealthyEating",
        likes: 18900, comments: 512, shares: 2100, saves: 3400,
        audio: "Lo-fi Chill Beats · lofi_radio",
    },
    {
        _id: "r3",
        user: mockUsers[1],
        imageUrl: "https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=400&h=720&fit=crop",
        caption: "Tokyo at 2am is a completely different world 🌃 #Tokyo #StreetPhotography #NightLife",
        likes: 31200, comments: 678, shares: 1890, saves: 1560,
        audio: "City Lights (Instrumental) · Marcus Chen",
    },
    {
        _id: "r4",
        user: mockUsers[4],
        imageUrl: "https://images.pexels.com/photos/1581554/pexels-photo-1581554.jpeg?auto=compress&cs=tinysrgb&w=400&h=720&fit=crop",
        caption: "Just dropped everything and booked a flight ✈️ Sometimes that's the only answer #Travel #Wanderlust",
        likes: 42000, comments: 891, shares: 5600, saves: 4200,
        audio: "Sunset Drive (Original) · priyasharma",
    },
    {
        _id: "r5",
        user: mockUsers[3],
        imageUrl: "https://images.pexels.com/photos/2827392/pexels-photo-2827392.jpeg?auto=compress&cs=tinysrgb&w=400&h=720&fit=crop",
        caption: "5am runs before the city wakes up. This is my church 🏃 #Running #MorningRun #FitLife",
        likes: 15600, comments: 234, shares: 980, saves: 1100,
        audio: "Morning Energy Mix · jordanriv",
    },
    {
        _id: "r6",
        user: mockUsers[6],
        imageUrl: "https://images.pexels.com/photos/1183992/pexels-photo-1183992.jpeg?auto=compress&cs=tinysrgb&w=400&h=720&fit=crop",
        caption: "3 weeks, 400 brushstrokes, and a whole lot of coffee ☕ 'In Between Worlds' is finished 🎨 #Art #Painting",
        likes: 28700, comments: 445, shares: 3200, saves: 2800,
        audio: "Classical Piano (Instrumental) · elenavasquez",
    },
    {
        _id: "r7",
        user: mockUsers[7],
        imageUrl: "https://images.pexels.com/photos/1323550/pexels-photo-1323550.jpeg?auto=compress&cs=tinysrgb&w=400&h=720&fit=crop",
        caption: "Morning sessions before the crowds. This wave had my name on it 🌊 #Surfing #OceanLife #Hawaii",
        likes: 19400, comments: 312, shares: 1450, saves: 1890,
        audio: "Original audio · kainakamura",
    },
    {
        _id: "r8",
        user: currentUser,
        imageUrl: "https://images.pexels.com/photos/1563356/pexels-photo-1563356.jpeg?auto=compress&cs=tinysrgb&w=400&h=720&fit=crop",
        caption: "3,200m above sea level. Zero signal, infinite clarity. This is why I shoot film 📸 #Mountains #Photography",
        likes: 9800, comments: 187, shares: 760, saves: 640,
        audio: "Original audio · alexjohnson",
    },
];

// ─── Direct Messages ──────────────────────────────────────────────────────────

export interface DMessage {
    _id: string;
    senderId: string;
    text: string;
    sentAt: string;
    seen: boolean;
    reactionEmoji?: string;
}

export interface Conversation {
    _id: string;
    participant: User;
    messages: DMessage[];
    unread: number;
}

const dm = (id: string, senderId: string, text: string, sentAt: string, seen = true): DMessage => ({
    _id: id, senderId, text, sentAt, seen,
});

export const mockConversations: Conversation[] = [
    {
        _id: "conv_u1",
        participant: mockUsers[0], // sophiaw
        unread: 2,
        messages: [
            dm("m1", "u1", "hey! loved your latest shots 😍", "2024-11-20T09:00:00Z"),
            dm("m2", "current_user", "thank you so much! means a lot 🙏", "2024-11-20T09:02:00Z"),
            dm("m3", "u1", "where was that beach photo taken?", "2024-11-20T09:03:00Z"),
            dm("m4", "current_user", "Malibu! early morning, totally worth waking up at 5am lol", "2024-11-20T09:05:00Z"),
            dm("m5", "u1", "omg that's dedication 😂 I need to do that", "2024-11-20T09:06:00Z"),
            dm("m6", "current_user", "100% recommend. bring coffee ☕", "2024-11-20T09:08:00Z"),
            dm("m7", "u1", "noted!! also are you going to the photo walk next week?", "2024-11-20T10:15:00Z", false),
            dm("m8", "u1", "a few of us are meeting at the park around 7am", "2024-11-20T10:16:00Z", false),
        ],
    },
    {
        _id: "conv_u3",
        participant: mockUsers[2], // isabellef
        unread: 0,
        messages: [
            dm("m9", "u3", "Alex! tried your recommended coffee spot in Portland", "2024-11-18T14:00:00Z"),
            dm("m10", "current_user", "and?? 👀", "2024-11-18T14:05:00Z"),
            dm("m11", "u3", "absolutely incredible. the pour-over was perfect", "2024-11-18T14:06:00Z"),
            dm("m12", "current_user", "told you!! it's the best in the city", "2024-11-18T14:07:00Z"),
            dm("m13", "u3", "I'm going back tomorrow lmao", "2024-11-18T14:08:00Z"),
            dm("m14", "current_user", "hahaha welcome to the club 😄", "2024-11-18T14:09:00Z"),
        ],
    },
    {
        _id: "conv_u2",
        participant: mockUsers[1], // marcuschen
        unread: 1,
        messages: [
            dm("m15", "current_user", "Marcus, your Tokyo shots are insane bro", "2024-11-17T20:00:00Z"),
            dm("m16", "u2", "haha thanks man, that city is magic at night", "2024-11-17T20:05:00Z"),
            dm("m17", "current_user", "what lens were you shooting with?", "2024-11-17T20:06:00Z"),
            dm("m18", "u2", "35mm f/1.4, wide open most of the time", "2024-11-17T20:08:00Z"),
            dm("m19", "current_user", "that explains the bokeh 🤌 incredible", "2024-11-17T20:10:00Z"),
            dm("m20", "u2", "you should come shoot with me next time I'm in LA", "2024-11-17T21:00:00Z", false),
        ],
    },
    {
        _id: "conv_u5",
        participant: mockUsers[4], // priyasharma
        unread: 0,
        messages: [
            dm("m21", "u5", "just booked flights to the Swiss Alps!! 🏔️", "2024-11-15T11:00:00Z"),
            dm("m22", "current_user", "NO WAY that's amazing!!! when??", "2024-11-15T11:03:00Z"),
            dm("m23", "u5", "late January, trying to catch the snow", "2024-11-15T11:04:00Z"),
            dm("m24", "current_user", "you're going to get incredible shots", "2024-11-15T11:05:00Z"),
            dm("m25", "u5", "that's the plan 📸 any tips from your trip there?", "2024-11-15T11:06:00Z"),
            dm("m26", "current_user", "pack layers and go at sunrise. trust me on both 😄", "2024-11-15T11:08:00Z"),
            dm("m27", "u5", "you're the best, thank you!!", "2024-11-15T11:09:00Z"),
        ],
    },
    {
        _id: "conv_u4",
        participant: mockUsers[3], // jordanriv
        unread: 0,
        messages: [
            dm("m28", "u4", "hey, started that morning run routine you mentioned", "2024-11-12T07:00:00Z"),
            dm("m29", "current_user", "dude! how's it going??", "2024-11-12T07:30:00Z"),
            dm("m30", "u4", "it's brutal but I already feel better honestly", "2024-11-12T07:32:00Z"),
            dm("m31", "current_user", "that's the magic of it. stick with it!", "2024-11-12T07:35:00Z"),
            dm("m32", "u4", "will do! thanks for the push 💪", "2024-11-12T07:36:00Z"),
        ],
    },
    {
        _id: "conv_u7",
        participant: mockUsers[6], // elenavasquez
        unread: 0,
        messages: [
            dm("m33", "u7", "just finished a new painting! wanted you to see it first", "2024-11-10T16:00:00Z"),
            dm("m34", "current_user", "elena!!! I'm so excited, share it!", "2024-11-10T16:05:00Z"),
            dm("m35", "u7", "will post tomorrow 🎨 it's my best work yet I think", "2024-11-10T16:06:00Z"),
            dm("m36", "current_user", "I can't wait. your work always blows me away", "2024-11-10T16:07:00Z"),
            dm("m37", "u7", "🥹 thank you that means everything", "2024-11-10T16:08:00Z"),
        ],
    },
    {
        _id: "conv_u6",
        participant: mockUsers[5], // noahbennett
        unread: 0,
        messages: [
            dm("m38", "u6", "saw your architecture shots from Chicago, really great framing", "2024-11-08T13:00:00Z"),
            dm("m39", "current_user", "thanks Noah! coming from an architect that means a lot", "2024-11-08T13:10:00Z"),
            dm("m40", "u6", "the way you used the reflection in the glass was clever", "2024-11-08T13:11:00Z"),
            dm("m41", "current_user", "honestly happy accident haha, but I'll take it", "2024-11-08T13:13:00Z"),
            dm("m42", "u6", "haha the best shots usually are 😄", "2024-11-08T13:14:00Z"),
        ],
    },
];

export function getConversation(userId: string): Conversation | undefined {
    return mockConversations.find((c) => c.participant._id === userId);
}

export function formatMessageTime(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();

    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0)
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        });

    if (diffDays === 1) return "Yesterday";

    if (diffDays < 7)
        return date.toLocaleDateString("en-US", {
            weekday: "short",
        });

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}
