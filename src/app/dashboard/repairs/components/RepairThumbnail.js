"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import ImageIcon from "@mui/icons-material/Image";
import { REPAIRS_UI } from "@/app/dashboard/repairs/components/repairsUi";

function pickImageValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return value.url || value.src || value.location || value.key || value.path || "";
  }
  return "";
}

export function getRepairImageUrl(repair) {
  if (!repair) return "";

  const candidates = [
    repair.picture,
    repair.image,
    repair.imageUrl,
    repair.photoUrl,
    repair.repairImage,
    repair.primaryImage,
    repair.beforePhoto,
    repair.beforePhotoUrl,
    repair.beforePhotos,
    repair.photos,
    repair.images,
    repair.afterPhotos,
  ];

  for (const candidate of candidates) {
    const value = Array.isArray(candidate) ? candidate[0] : candidate;
    const url = pickImageValue(value);
    if (url) return url;
  }

  return "";
}

export default function RepairThumbnail({
  repair,
  size = 72,
  aspectRatio = "1 / 1",
  sx = {},
}) {
  const imageUrl = getRepairImageUrl(repair);
  const numericSize = typeof size === "number" ? size : 72;

  return (
    <Box
      sx={{
        width: size,
        height: aspectRatio === "1 / 1" ? size : "auto",
        aspectRatio,
        flexShrink: 0,
        borderRadius: 1,
        overflow: "hidden",
        border: `1px solid ${REPAIRS_UI.border}`,
        backgroundColor: REPAIRS_UI.bgCard,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: REPAIRS_UI.textMuted,
        ...sx,
      }}
    >
      {imageUrl ? (
        <Box
          component="img"
          src={imageUrl}
          alt="Repair item"
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <Box sx={{ textAlign: "center", px: 0.5 }}>
          <ImageIcon sx={{ fontSize: Math.max(22, Math.round(numericSize * 0.34)), display: "block", mx: "auto" }} />
          {numericSize >= 70 && (
            <Typography variant="caption" sx={{ display: "block", fontSize: "0.65rem", lineHeight: 1.1 }}>
              No image
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
