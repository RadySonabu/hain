export type RecipeStep = {
  text: string;
  imageUrl?: string;
  duration?: number; // seconds
};

export type Recipe = {
  id: string;
  title: string;
  tagline: string;
  category: string;
  cookTime: string;
  servings: number;
  rating: number;
  ratingCount: number;
  imageUrl: string;
  username: string;
  avatar: string;
  likes: number;
  commentCount: number;
  timeAgo: string;
  description: string;
  ingredients: string[];
  steps: RecipeStep[];
  isUserCreated?: boolean;
  isPublic?: boolean;
  difficulty?: "Easy" | "Medium" | "Hard";
  primaryFlavors?: string[];
};

export const RECIPES: Recipe[] = [
  {
    id: "1",
    title: "Shakshuka",
    tagline: "A Middle Eastern breakfast staple",
    category: "Breakfast",
    cookTime: "20 min",
    servings: 2,
    rating: 4.8,
    ratingCount: 243,
    imageUrl: "https://picsum.photos/seed/shakshuka/600/600",
    username: "chef_marco",
    avatar: "https://picsum.photos/seed/marco/80/80",
    likes: 12847,
    commentCount: 243,
    timeAgo: "2 hours ago",
    description:
      "Eggs poached in a rich, spiced tomato sauce — a one-pan wonder that comes together in 20 minutes. Perfect for a lazy weekend brunch or a quick weeknight dinner.",
    ingredients: [
      "2 tbsp olive oil",
      "1 medium onion, finely diced",
      "1 red bell pepper, chopped",
      "3 garlic cloves, minced",
      "1 tsp cumin",
      "1 tsp smoked paprika",
      "½ tsp chili flakes",
      "1 can (400g) crushed tomatoes",
      "4 large eggs",
      "Salt and pepper to taste",
      "Fresh flat-leaf parsley, to serve",
      "Crusty bread, to serve",
    ],
    steps: [
      {
        text: "Heat olive oil in a large skillet over medium heat until shimmering.",
        imageUrl: "https://picsum.photos/seed/step1a/600/400",
      },
      {
        text: "Add onion and bell pepper. Cook for 5 minutes until softened and starting to caramelize.",
        imageUrl: "https://picsum.photos/seed/step2a/600/400",
        duration: 300,
      },
      {
        text: "Add garlic, cumin, paprika, and chili flakes. Stir constantly for 1 minute until fragrant.",
        imageUrl: "https://picsum.photos/seed/step3a/600/400",
        duration: 60,
      },
      {
        text: "Pour in crushed tomatoes and season. Simmer for 10 minutes, stirring occasionally.",
        imageUrl: "https://picsum.photos/seed/step4a/600/400",
        duration: 600,
      },
      {
        text: "Make 4 shallow wells in the sauce. Crack one egg into each well.",
        imageUrl: "https://picsum.photos/seed/step5a/600/400",
      },
      {
        text: "Cover and cook for 5 minutes until whites are set but yolks remain runny.",
        duration: 300,
      },
      {
        text: "Scatter fresh parsley on top and serve straight from the pan with crusty bread.",
      },
    ],
  },
  {
    id: "2",
    title: "Spaghetti Carbonara",
    tagline: "Roman pasta perfection",
    category: "Pasta",
    cookTime: "30 min",
    servings: 4,
    rating: 4.9,
    ratingCount: 188,
    imageUrl: "https://picsum.photos/seed/carbonara/600/600",
    username: "tasteofasia",
    avatar: "https://picsum.photos/seed/asia/80/80",
    likes: 9302,
    commentCount: 188,
    timeAgo: "5 hours ago",
    description:
      "The real Roman carbonara — no cream, just silky eggs, aged pecorino, and guanciale. It's one of those dishes where technique is everything.",
    ingredients: [
      "400g spaghetti",
      "200g guanciale or pancetta, cubed",
      "4 large egg yolks + 1 whole egg",
      "100g Pecorino Romano, finely grated",
      "50g Parmesan, finely grated",
      "2 tsp freshly cracked black pepper",
      "Salt for pasta water",
    ],
    steps: [
      {
        text: "Bring a large pot of well-salted water to a rolling boil.",
        imageUrl: "https://picsum.photos/seed/carb1/600/400",
      },
      {
        text: "Whisk egg yolks, whole egg, pecorino, parmesan, and black pepper into a smooth paste.",
        imageUrl: "https://picsum.photos/seed/carb2/600/400",
      },
      {
        text: "Cook guanciale in a cold skillet over medium heat for 8 minutes until crispy.",
        imageUrl: "https://picsum.photos/seed/carb3/600/400",
        duration: 480,
      },
      {
        text: "Cook spaghetti 1 minute less than package time. Reserve 1 cup pasta water before draining.",
        duration: 480,
      },
      {
        text: "Remove skillet from heat. Add drained pasta and toss with the guanciale fat.",
        imageUrl: "https://picsum.photos/seed/carb5/600/400",
      },
      {
        text: "Add egg mixture and a splash of pasta water. Toss vigorously off heat until silky and creamy.",
        imageUrl: "https://picsum.photos/seed/carb6/600/400",
      },
      { text: "Serve immediately with extra pecorino and a generous crack of black pepper." },
    ],
  },
  {
    id: "3",
    title: "Avocado Buddha Bowl",
    tagline: "Nourish your body, feed your soul",
    category: "Vegan",
    cookTime: "15 min",
    servings: 2,
    rating: 4.6,
    ratingCount: 134,
    imageUrl: "https://picsum.photos/seed/avobowl/600/600",
    username: "verde_kitchen",
    avatar: "https://picsum.photos/seed/verde/80/80",
    likes: 7561,
    commentCount: 134,
    timeAgo: "8 hours ago",
    description:
      "A vibrant, nutrient-packed bowl loaded with roasted veggies, creamy avocado, and a tahini-lemon drizzle. Ready in 15 minutes flat.",
    ingredients: [
      "1 cup cooked quinoa",
      "1 ripe avocado, sliced",
      "1 cup cherry tomatoes, halved",
      "1 cup cucumber, diced",
      "½ cup chickpeas, drained and rinsed",
      "2 tbsp tahini",
      "Juice of 1 lemon",
      "1 tsp maple syrup",
      "Salt and pepper to taste",
      "Fresh mint leaves, to garnish",
    ],
    steps: [
      {
        text: "Cook quinoa according to package instructions. Allow to cool for a few minutes.",
        imageUrl: "https://picsum.photos/seed/bud1/600/400",
        duration: 900,
      },
      {
        text: "Whisk together tahini, lemon juice, maple syrup, and 2 tbsp water until pourable and smooth.",
        imageUrl: "https://picsum.photos/seed/bud2/600/400",
      },
      { text: "Divide quinoa between two bowls as the base.", imageUrl: "https://picsum.photos/seed/bud3/600/400" },
      {
        text: "Arrange avocado, cherry tomatoes, cucumber, and chickpeas on top.",
        imageUrl: "https://picsum.photos/seed/bud4/600/400",
      },
      { text: "Drizzle tahini dressing generously over the bowls." },
      { text: "Garnish with fresh mint and a final squeeze of lemon." },
    ],
  },
  {
    id: "4",
    title: "Chocolate Lava Cake",
    tagline: "The molten center that dreams are made of",
    category: "Dessert",
    cookTime: "25 min",
    servings: 2,
    rating: 4.7,
    ratingCount: 407,
    imageUrl: "https://picsum.photos/seed/lavacake/600/600",
    username: "bakehouse_jenna",
    avatar: "https://picsum.photos/seed/jenna/80/80",
    likes: 21480,
    commentCount: 407,
    timeAgo: "11 hours ago",
    description:
      "A restaurant-quality chocolate lava cake you can make at home in under 30 minutes. The gooey, molten center is pure indulgence.",
    ingredients: [
      "115g dark chocolate (70%), chopped",
      "115g unsalted butter, plus extra for greasing",
      "2 large eggs + 2 egg yolks",
      "80g icing sugar",
      "60g all-purpose flour",
      "1 tsp vanilla extract",
      "Cocoa powder for dusting",
      "Vanilla ice cream, to serve",
    ],
    steps: [
      {
        text: "Preheat oven to 220°C (425°F). Butter two ramekins and dust with cocoa powder.",
        imageUrl: "https://picsum.photos/seed/lava1/600/400",
        duration: 600,
      },
      {
        text: "Melt chocolate and butter together over simmering water. Stir until completely smooth.",
        imageUrl: "https://picsum.photos/seed/lava2/600/400",
      },
      {
        text: "Whisk eggs, yolks, and sugar together until pale and slightly thickened.",
        imageUrl: "https://picsum.photos/seed/lava3/600/400",
      },
      {
        text: "Fold chocolate mixture into eggs. Sift in flour and fold gently until just combined.",
        imageUrl: "https://picsum.photos/seed/lava4/600/400",
      },
      {
        text: "Divide batter between ramekins. Bake for exactly 12 minutes — edges set, center wobbly.",
        imageUrl: "https://picsum.photos/seed/lava5/600/400",
        duration: 720,
      },
      { text: "Rest 1 minute, then run a knife around the edge and invert onto plates.", duration: 60 },
      { text: "Serve immediately with a scoop of vanilla ice cream." },
    ],
  },
  {
    id: "5",
    title: "Chicken Stir-fry",
    tagline: "Weeknight dinner in under 20 minutes",
    category: "Quick",
    cookTime: "15 min",
    servings: 3,
    rating: 4.5,
    ratingCount: 96,
    imageUrl: "https://picsum.photos/seed/stirfry/600/600",
    username: "grill_master_ko",
    avatar: "https://picsum.photos/seed/ko/80/80",
    likes: 5213,
    commentCount: 96,
    timeAgo: "1 day ago",
    description:
      "High heat, quick hands, bold flavors. This chicken stir-fry is the weeknight dinner that never fails — ready before you can order delivery.",
    ingredients: [
      "500g chicken breast, thinly sliced",
      "2 tbsp vegetable oil",
      "3 garlic cloves, minced",
      "1 tbsp fresh ginger, grated",
      "1 red bell pepper, julienned",
      "2 cups broccoli florets",
      "3 tbsp soy sauce",
      "1 tbsp oyster sauce",
      "1 tsp sesame oil",
      "1 tsp cornstarch",
      "Steamed rice, to serve",
    ],
    steps: [
      {
        text: "Mix soy sauce, oyster sauce, sesame oil, and cornstarch in a small bowl. Set aside.",
        imageUrl: "https://picsum.photos/seed/stir1/600/400",
      },
      {
        text: "Heat a wok over high heat until nearly smoking. Add oil.",
        imageUrl: "https://picsum.photos/seed/stir2/600/400",
      },
      {
        text: "Add chicken in a single layer. Sear without moving for 2 minutes.",
        imageUrl: "https://picsum.photos/seed/stir3/600/400",
        duration: 120,
      },
      { text: "Stir-fry chicken for another 2 minutes until cooked through. Remove and set aside.", duration: 120 },
      {
        text: "Add garlic and ginger to the wok. Stir-fry for 30 seconds until fragrant.",
        imageUrl: "https://picsum.photos/seed/stir5/600/400",
        duration: 30,
      },
      {
        text: "Add bell pepper and broccoli. Stir-fry for 3 minutes until tender-crisp.",
        imageUrl: "https://picsum.photos/seed/stir6/600/400",
        duration: 180,
      },
      {
        text: "Return chicken to wok, pour in sauce, and toss to coat. Serve over steamed rice.",
        imageUrl: "https://picsum.photos/seed/stir7/600/400",
      },
    ],
  },
];
