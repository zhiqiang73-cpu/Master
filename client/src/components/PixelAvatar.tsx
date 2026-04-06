/**
 * PixelAvatar.tsx — 像素风替身头像
 * 纯 CSS 像素小人，每个替身颜色/形态不同
 * 灵感来源：红白机经典像素风格 + clawcard.sh 多彩配色
 */

// 像素调色板（多彩，参考 clawcard.sh 风格）
const PIXEL_PALETTES = [
  // [body, hair, skin, accent]
  ["#2a9d8f", "#1d3557", "#f4a261", "#457b9d"],  // 青绿衣蓝发
  ["#2a9d8f", "#264653", "#e9c46a", "#f4a261"],  // 青衣深发
  ["#e9c46a", "#264653", "#f4a261", "#e76f51"],  // 黄衣深发
  ["#457b9d", "#1d3557", "#f4a261", "#a8dadc"],  // 蓝衣深发
  ["#e76f51", "#264653", "#e9c46a", "#2a9d8f"],  // 橙衣深发
  ["#a8dadc", "#1d3557", "#f4a261", "#2a9d8f"],  // 浅蓝衣
  ["#6a4c93", "#1d3557", "#f4a261", "#c77dff"],  // 紫衣
  ["#52b788", "#081c15", "#f4a261", "#d8f3dc"],  // 绿衣
  ["#f72585", "#3a0ca3", "#f4a261", "#4cc9f0"],  // 粉衣紫发
  ["#4361ee", "#023e8a", "#f4a261", "#4cc9f0"],  // 深蓝衣
];

// 根据替身 ID 或颜色字符串确定调色板索引
function getPaletteIndex(colorOrId: string | number | null | undefined): number {
  if (typeof colorOrId === "number") return colorOrId % PIXEL_PALETTES.length;
  if (!colorOrId) return 0;
  // 从颜色字符串哈希
  let hash = 0;
  for (let i = 0; i < colorOrId.length; i++) {
    hash = colorOrId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % PIXEL_PALETTES.length;
}

// 像素小人 SVG — 经典红白机风格
function PixelCharacterSVG({
  palette,
  size,
  variant = 0,
}: {
  palette: string[];
  size: number;
  variant?: number;
}) {
  const [body, hair, skin, accent] = palette;
  const px = size / 16; // 每个像素点的大小

  // 不同变体（帽子/发型/配件）
  const hairStyles = [
    // 变体0: 短发
    [[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[10,1],[11,1],[12,1],
     [3,2],[4,2],[12,2],[3,3],[4,3],[12,3]],
    // 变体1: 长发
    [[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[10,1],[11,1],[12,1],
     [3,2],[12,2],[3,3],[12,3],[3,4],[12,4],[3,5],[12,5]],
    // 变体2: 帽子
    [[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[10,1],[11,1],[12,1],[13,1],
     [4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2]],
    // 变体3: 爆炸头
    [[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0],[12,0],
     [2,1],[3,1],[12,1],[13,1],[2,2],[13,2],[3,3],[12,3]],
  ];

  const hairPixels = hairStyles[variant % hairStyles.length];

  // 身体像素定义 (x, y, color_index: 0=body, 1=hair, 2=skin, 3=accent)
  const bodyPixels: [number, number, number][] = [
    // 脸部
    [5,3,2],[6,3,2],[7,3,2],[8,3,2],[9,3,2],[10,3,2],
    [4,4,2],[5,4,2],[6,4,2],[7,4,2],[8,4,2],[9,4,2],[10,4,2],[11,4,2],
    [4,5,2],[5,5,2],[6,5,2],[7,5,2],[8,5,2],[9,5,2],[10,5,2],[11,5,2],
    // 眼睛（深色）
    [6,4,1],[9,4,1],
    // 嘴巴
    [6,5,3],[7,5,3],[8,5,3],[9,5,3],
    // 脖子
    [7,6,2],[8,6,2],
    // 身体
    [4,7,0],[5,7,0],[6,7,0],[7,7,0],[8,7,0],[9,7,0],[10,7,0],[11,7,0],
    [3,8,0],[4,8,0],[5,8,0],[6,8,0],[7,8,0],[8,8,0],[9,8,0],[10,8,0],[11,8,0],[12,8,0],
    [3,9,0],[4,9,0],[5,9,0],[6,9,0],[7,9,0],[8,9,0],[9,9,0],[10,9,0],[11,9,0],[12,9,0],
    [3,10,0],[4,10,0],[5,10,0],[6,10,0],[7,10,0],[8,10,0],[9,10,0],[10,10,0],[11,10,0],[12,10,0],
    // 领子/装饰
    [6,7,3],[7,7,3],[8,7,3],[9,7,3],
    // 手臂
    [2,8,2],[2,9,2],[2,10,2],[13,8,2],[13,9,2],[13,10,2],
    [1,9,2],[1,10,2],[14,9,2],[14,10,2],
    // 腿
    [5,11,0],[6,11,0],[9,11,0],[10,11,0],
    [5,12,0],[6,12,0],[9,12,0],[10,12,0],
    [5,13,0],[6,13,0],[9,13,0],[10,13,0],
    // 鞋子
    [4,14,1],[5,14,1],[6,14,1],[9,14,1],[10,14,1],[11,14,1],
  ];

  const colors = [body, hair, skin, accent];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      style={{ imageRendering: "pixelated" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 背景 */}
      <rect width="16" height="16" fill="transparent" />

      {/* 发型像素 */}
      {hairPixels.map(([x, y], i) => (
        <rect key={`h${i}`} x={x} y={y} width={1} height={1} fill={hair} />
      ))}

      {/* 身体像素 */}
      {bodyPixels.map(([x, y, c], i) => (
        <rect key={`b${i}`} x={x} y={y} width={1} height={1} fill={colors[c]} />
      ))}
    </svg>
  );
}

interface PixelAvatarProps {
  roleId?: number;
  name?: string;
  color?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showBorder?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

const BORDER_SIZE_MAP = {
  xs: "border",
  sm: "border",
  md: "border-2",
  lg: "border-2",
  xl: "border-[3px]",
};

export function PixelAvatar({
  roleId,
  name,
  color,
  size = "md",
  showBorder = true,
  className = "",
}: PixelAvatarProps) {
  const paletteIdx = getPaletteIndex(color ?? roleId);
  const palette = PIXEL_PALETTES[paletteIdx];
  const variant = (roleId ?? 0) % 4;
  const px = SIZE_MAP[size];
  const bgColor = palette[0] + "22"; // 20% opacity background

  return (
    <div
      className={`
        flex-shrink-0 overflow-hidden
        ${showBorder ? `${BORDER_SIZE_MAP[size]} border-current` : ""}
        ${className}
      `}
      style={{
        width: px,
        height: px,
        backgroundColor: bgColor,
        borderColor: palette[0] + "66",
        // 像素风：方形，无圆角
        borderRadius: 0,
        imageRendering: "pixelated",
      }}
    >
      <PixelCharacterSVG palette={palette} size={px} variant={variant} />
    </div>
  );
}

// 像素风广场场景 — 多个替身小人站在一起
export function PixelSquareScene({
  roles,
  height = 120,
}: {
  roles: Array<{ id: number; name: string; color?: string | null }>;
  height?: number;
}) {
  // 最多显示 12 个替身
  const displayRoles = roles.slice(0, 12);

  // 地面颜色
  const groundColors = ["#8B7355", "#A0856B", "#8B7355", "#7A6248"];

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height, background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 60%, #e8edf5 100%)" }}
    >
      {/* 浮动小点装饰 */}
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            width: 3,
            height: 3,
            background: ["#94a3b8", "#7c9cc0", "#a5b4c8", "#8faac4"][i % 4],
            left: `${(i * 17 + 3) % 95}%`,
            top: `${(i * 13 + 5) % 50}%`,
            opacity: 0.3 + (i % 4) * 0.1,
            imageRendering: "pixelated",
          }}
        />
      ))}

      {/* 像素建筑轮廓（背景） */}
      <div className="absolute bottom-[30px] left-0 right-0 flex items-end justify-around px-4">
        {[40, 65, 50, 80, 45, 70, 55, 85, 42, 68].map((h, i) => (
          <div
            key={i}
            className="flex-shrink-0"
            style={{
              width: 18 + (i % 3) * 6,
              height: h * (height / 120),
              background: ["#dde5f0", "#d4dff0", "#ccd9ec", "#c4d2e8"][i % 4],
              borderTop: "2px solid " + ["#94a3b8", "#7c9cc0", "#8faac4", "#7b96b8"][i % 4],
            }}
          >
            {/* 窗户 */}
            {[...Array(Math.floor(h / 20))].map((_, wi) => (
              <div key={wi} className="flex gap-1 justify-center mt-1">
                <div style={{ width: 3, height: 3, background: Math.random() > 0.4 ? "#94a3b8" : "#e2e8f0" }} />
                <div style={{ width: 3, height: 3, background: Math.random() > 0.4 ? "#94a3b8" : "#e2e8f0" }} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* 地面 */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: 30,
          background: "repeating-linear-gradient(90deg, #cbd5e1 0px, #cbd5e1 8px, #e2e8f0 8px, #e2e8f0 16px)",
          borderTop: "2px solid #94a3b8",
        }}
      />

      {/* 替身小人们站在地面上 */}
      <div className="absolute bottom-[30px] left-0 right-0 flex items-end justify-center gap-2 px-6">
        {displayRoles.map((role, i) => {
          const paletteIdx = getPaletteIndex(role.color ?? role.id);
          const palette = PIXEL_PALETTES[paletteIdx];
          const variant = role.id % 4;
          const charHeight = 40 + (i % 3) * 6; // 不同高度增加层次感

          return (
            <div
              key={role.id}
              className="flex flex-col items-center flex-shrink-0"
              style={{ marginBottom: i % 2 === 0 ? 0 : 4 }}
              title={role.name}
            >
              <PixelCharacterSVG palette={palette} size={charHeight} variant={variant} />
            </div>
          );
        })}

        {/* 如果没有替身，显示占位小人 */}
        {displayRoles.length === 0 && (
          <>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="flex-shrink-0">
                <PixelCharacterSVG
                  palette={PIXEL_PALETTES[i]}
                  size={40 + (i % 3) * 6}
                  variant={i % 4}
                />
              </div>
            ))}
          </>
        )}
      </div>

      {/* 霓虹灯标题 */}
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 whitespace-nowrap"
        style={{
          fontFamily: "'Inter', 'Outfit', sans-serif",
          fontSize: Math.max(10, height / 10),
          fontWeight: 700,
          color: "oklch(52% 0.11 172)",
          textShadow: "none",
          letterSpacing: "0.15em",
          imageRendering: "pixelated",
        }}
      >
        [ STAND SQUARE ]
      </div>
    </div>
  );
}

export default PixelAvatar;
