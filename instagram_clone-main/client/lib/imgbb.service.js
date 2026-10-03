export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(
    `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
    {
      method: "POST",
      body: formData,
    },
  );
  const data = await res.json();

  if (!data.success) {
    throw new Error("Image upload failed");
  }
  return {
    url: data.data.url,
    type: "image",
    width: Number(data.data.width),
    height: Number(data.data.height),
  };
};
